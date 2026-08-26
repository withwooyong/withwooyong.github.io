import type { PagefindData, PagefindResult } from "./pagefind-loader";
import { isIndexNoise } from "./korean";

export type Hit = PagefindData & { id: string };

/** 화면에 채울 결과 수. */
const DEFAULT_WANT = 8;

/**
 * 한 배치의 상한. 실측 조각 평균 6,555B → 8건 ≈ 51KB.
 *
 * 다만 **첫 배치만 8건까지 간다.** 이후 배치는 `need + NOISE_MARGIN` 으로 좁혀지므로
 * 실제 전송량은 아래 「기대」쪽이다.
 *
 * 계산값(실측 아님 — 조각 평균 6,555B 와 잡음율 26.9% 위에서 계산한 것):
 * 첫 배치 8건이 전부 통과할 확률은 `0.731^8 ≈ 8%` 뿐이라 92% 의 검색이 2차 배치를 받는다.
 * 첫 배치 기대 통과 ≈ 5.9건 → 남은 필요 ≈ 2건 → 2차 배치 ≈ 4건.
 * **기대 총 12~13조각 ≈ 80KB 안팎.** (`need` 반영 전에는 8+8=16조각 ≈ 105KB 였고,
 * 그중 최대 7조각을 `slice` 로 버렸다.)
 */
const DEFAULT_BATCH = 8;

/** `data()` 총 호출 상한. 24건 ≈ 157KB 에서 끊는다. */
const DEFAULT_MAX_LOAD = 24;

/**
 * 남은 필요 건수에 얹는 여유분.
 *
 * 잡음율이 실측 26.9% 라, 예컨대 2건만 더 필요할 때 딱 2건을 받으면 그중 1건이 잡음일
 * 확률이 `1 - 0.731^2 ≈ 47%` 로 높다. 그러면 배치가 한 번 더 돌아 왕복이 늘어난다.
 * +2 는 그 추가 왕복을 막으면서도 버리는 조각을 2건 이하로 묶는 절충이다.
 */
const NOISE_MARGIN = 2;

function alwaysContinue(): boolean {
  return true;
}

/**
 * 결과 stub 목록에서 잡음을 걸러 낸 상위 N 건을 만든다.
 *
 * Pagefind 의 stub 은 `id` 만 갖고 URL 을 모른다 — 잡음인지 알려면 `data()` 를
 * 불러야 하고, 그건 네트워크 왕복이다. 그래서 전부 부르지 않고 배치로 나눠
 * **필요한 만큼만** 부른다.
 *
 * 한 건의 `data()` 가 실패해도 전체가 죽지 않는다. 그 건만 버리고 계속한다.
 *
 * `shouldContinue` 로 취소 신호를 받는다 — 배치가 최대 3회 **직렬**로 돌기 때문에,
 * 확인이 이 함수 바깥에만 있으면 버려질 검색이 끝까지 조각을 받아 새 쿼리를 막는다.
 */
export async function collectHits(
  results: PagefindResult[],
  opts?: {
    want?: number;
    batch?: number;
    maxLoad?: number;
    /** false 를 돌려주면 지금까지 모은 것을 그대로 반환하고 멈춘다. */
    shouldContinue?: () => boolean;
  },
): Promise<Hit[]> {
  const want = opts && opts.want !== undefined ? opts.want : DEFAULT_WANT;
  const batch = opts && opts.batch !== undefined ? opts.batch : DEFAULT_BATCH;
  const maxLoad =
    opts && opts.maxLoad !== undefined ? opts.maxLoad : DEFAULT_MAX_LOAD;
  const shouldContinue =
    opts && opts.shouldContinue ? opts.shouldContinue : alwaysContinue;

  const hits: Hit[] = [];
  let cursor = 0;
  let loaded = 0;

  while (cursor < results.length && hits.length < want && loaded < maxLoad) {
    // 배치를 시작하기 **전에** 확인한다. 한 배치는 왕복 한 번이다.
    if (!shouldContinue()) break;

    // 이미 채운 만큼은 빼고 받는다. 안 그러면 7건을 채운 뒤에도 8건을 통째로 받아
    // 최대 7조각을 `slice` 로 버린다.
    const need = want - hits.length;
    const room = Math.min(
      batch,
      maxLoad - loaded,
      results.length - cursor,
      need + NOISE_MARGIN,
    );
    if (room <= 0) break;

    const slice = results.slice(cursor, cursor + room);
    cursor += room;
    loaded += room;

    // 배치 안에서는 병렬. 한 건의 실패는 null 로 흡수한다.
    const loadedBatch = await Promise.all(
      slice.map(function (result) {
        return result
          .data()
          .then(function (data) {
            return { id: result.id, data: data };
          })
          .catch(function () {
            return null;
          });
      }),
    );

    for (const entry of loadedBatch) {
      if (!entry) continue;
      if (isIndexNoise(entry.data.url)) continue;
      hits.push(Object.assign({}, entry.data, { id: entry.id }));
    }
  }

  return hits.slice(0, want);
}
