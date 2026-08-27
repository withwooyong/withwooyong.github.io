import Link from "next/link";
import type { AtlasNeighbor } from "@/lib/atlas/neighbors";
import type { AtlasEdgeType, AtlasNode } from "@/lib/atlas/types";

/**
 * 노드 하나의 상세. 설계서 §7 · 계획서 T11.
 *
 * 자리가 둘이다 — `/atlas` 에서는 우측 패널(선택에 따라 클라이언트에서 바뀐다),
 * `/atlas/<id>` 에서는 본문(빌드 시점에 고정된다).
 *
 * ⚠️ **`graph` 를 받지 않는다.** 계획서 초안은 `NodePanel({ graph, node })` 로 그래프를
 *    통째로 넘기고 패널 안에서 이웃을 계산했는데, 그러면 상세 페이지가 props 로 그래프를
 *    받아야 하고 산출물이 **+70MB** 가 된다(`lib/atlas/neighbors.ts` 주석 참고).
 *    계산은 `neighborsOf()` 가 하고, 이 컴포넌트는 **받은 것을 그리기만 한다.**
 *    덕분에 두 자리가 같은 규칙을 쓰고, 그 규칙에는 `tests/atlas/neighbors.test.ts` 가 걸린다.
 *
 * ⚠️ `@/lib/atlas/types` 에서 **값**을 가져오지 마라 — `zod` 가 브라우저 번들에 실린다.
 *    `import type` 이라야 트랜스파일러가 지운다(`isolatedModules: true`).
 *
 * 다크 대응은 `dark:` 변형이 아니라 토큰이 한다 — `components/atlas/list-view.tsx` 와 같다.
 * `text-n9` 는 `var(--n9)` 로 풀리고 `--n9` 자체가 테마별로 재정의된다(`styles/globals.css`).
 * 색을 리터럴로 쓰지 마라. 여기에 `dark:` 를 섞으면 토큰이 이미 바꾼 값을 한 번 더 덮는다.
 */

/**
 * 엣지 타입의 한글 표기.
 *
 * `Record<AtlasEdgeType, string>` 이라 타입이 늘면 **여기가 컴파일 에러로 먼저 터진다.**
 * `EDGE_TYPES` 를 값으로 가져와 순회하지 않는 것은 zod 때문이다(위 주석).
 */
const EDGE_LABEL: Record<AtlasEdgeType, string> = {
  supports: "뒷받침",
  contradicts: "반박",
  extends: "이어짐",
  instantiates: "속함",
  depends_on: "의존",
  sequence: "다음 편",
};

/** 노드 종류의 한글 표기. `claim`·`procedure` 는 1차 데이터에 없지만 타입에는 있다(§7.9). */
const NODE_LABEL: Record<AtlasNode["type"], string> = {
  artifact: "글",
  concept: "토픽",
  claim: "주장",
  procedure: "절차",
};

export function NodePanel({
  node,
  neighbors,
  titleAs: Title = "h2",
}: {
  node: AtlasNode;
  neighbors: AtlasNeighbor[];
  /**
   * 제목을 어느 레벨로 낼지. **기본은 `h2`** 이므로 호출부는 `{ node, neighbors }` 만 넘겨도 된다.
   *
   * 이 프롭이 있는 이유는 한 가지다. `/atlas` 에서는 페이지 제목이 「지식 아틀라스」라
   * 패널은 그 아래 `h2` 가 맞지만, `/atlas/<id>` 에서는 **노드 제목이 곧 페이지 제목**이다.
   * 이 리포의 상세 페이지는 전부 항목 제목을 `h1` 으로 낸다(`pages/blog/[category]/[slug].tsx`
   * 의 `{post.title}`, `pages/product-lead-wiki/[slug].tsx` 의 `{doc.title}`).
   * 여기만 `h1` 없이 `h2` 로 시작하면 162 페이지가 그 규칙에서 혼자 벗어난다 —
   * 그렇다고 페이지가 `h1` 을 따로 내면 같은 제목이 화면에 두 번 뜬다.
   */
  titleAs?: "h1" | "h2";
}) {
  /*
    「연결」 제목은 노드 제목의 **바로 아래 단계**여야 한다. h3 로 고정해 두면
    상세 페이지(`titleAs="h1"`)에서 h1 → h3 로 한 단계를 건너뛴다 — 실측 전수로
    162 장 전부가 h1 1개 · h2 0개 · h3 1개였다. 스크린리더의 제목 이동은 레벨 차이를
    「빠진 절」로 읽으므로, 레벨을 제목에 연동한다.
  */
  const Connections = Title === "h1" ? "h2" : "h3";

  return (
    <div>
      <p className="text-label uppercase tracking-widest text-n6">{NODE_LABEL[node.type]}</p>
      <Title className="mt-2 text-section font-bold text-n9 break-keep">{node.title}</Title>
      {node.summary ? <p className="mt-3 text-body text-n7 break-keep">{node.summary}</p> : null}

      {node.source?.kind === "note" ? (
        <Link
          href={node.source.ref}
          className="mt-4 inline-block text-body text-signal underline underline-offset-4 break-keep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n0"
        >
          원문 읽기 →
        </Link>
      ) : null}

      {node.tags.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {node.tags.map((t) => (
            <li key={t} className="rounded border border-n4 px-2 py-0.5 text-label text-n6 break-keep">
              {t}
            </li>
          ))}
        </ul>
      ) : null}

      <Connections className="mt-8 text-card-title font-semibold text-n9 break-keep">
        연결 <span className="text-label text-n6">{neighbors.length}</span>
      </Connections>
      {neighbors.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {neighbors.map((n) => (
            /*
              key 에 타입을 넣는다. 무방향 dedupe 뒤에도 **같은 이웃이 타입별로 여러 건** 남을 수
              있어서다(예: `extends` 와 `sequence` 가 동시에 걸린 쌍). id 만 쓰면 React 가
              중복 key 로 경고하고 목록이 어긋난다.
            */
            <li key={`${n.type}|${n.id}`} className="text-body break-keep">
              <span className="text-label text-n6">{EDGE_LABEL[n.type]}</span>{" "}
              <Link
                href={`/atlas/${n.id}/`}
                className="text-n8 underline underline-offset-4 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n0"
              >
                {n.title}
              </Link>{" "}
              <span className="text-label text-n6">{NODE_LABEL[n.nodeType]}</span>
            </li>
          ))}
        </ul>
      ) : (
        /*
          T9 실측: inbound 0 인 글이 4 편 있다(전부 `role: "map"`). 이 패널은 무방향이라
          그 4 편도 하위 글에서 「이어짐」으로 잡히므로 여기가 비는 일은 사실상 없지만,
          비었을 때 목록이 통째로 사라지면 「깨진 것」처럼 보인다. 문장을 남긴다.
        */
        <p className="mt-3 text-body text-n6 break-keep">아직 이어진 글이 없습니다.</p>
      )}
    </div>
  );
}
