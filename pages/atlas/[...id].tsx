import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import { NodePanel } from "@/components/atlas/node-panel";
import { SiteHead } from "@/components/site-head";
import { SiteShell } from "@/components/site-shell";
import { buildGraph } from "@/lib/atlas/build";
import type { AtlasGraph } from "@/lib/atlas/types";
import { nodeDetailProps, type AtlasNodeDetail } from "@/lib/atlas/neighbors";
import { readPosts } from "@/lib/blog/loader";

/**
 * 노드 상세. 설계서 §7 · 계획서 T11.
 *
 * ⚠️ **`[...id]` catch-all 이다.** 노드 id 에 슬래시가 들어가기 때문이다
 *    (글 `<category>/<slug>` · 토픽 `topic/<slug>`). `[id]` 로 두면 슬래시가 든 id 가
 *    통째로 404 가 된다.
 *
 * ⚠️ **props 에 `graph` 를 넣지 마라.** Next 는 `getStaticProps` 의 props 를
 *    `__NEXT_DATA__` 인라인과 `_next/data/*.json` 에 **두 번** 쓴다. 그래프 전체는
 *    실측 226,605B 라 163 페이지 × 2 = **+70.5MB** 다. `nodeDetailProps` 가 내는
 *    `{ node, neighbors }` 는 162개 총합 427,706B(평균 2,640 · 최대 9,803).
 *    `tests/atlas/neighbors.test.ts` 의 예산 테스트가 이 차이를 차등 대조로 붙들고 있다.
 */

/**
 * 그래프를 빌드 프로세스 안에서 한 번만 만든다.
 *
 * `getStaticPaths` 1회 + `getStaticProps` 162회가 전부 `buildGraph(readPosts())` 를 부르면
 * 156편 마크다운을 163번 다시 읽는다. 결과가 입력에만 의존하는 순수 계산이라 캐시가 안전하다.
 * 정적 export 라 이 모듈은 빌드 때만 산다 — 런타임에 낡을 일이 없다.
 */
let cachedGraph: AtlasGraph | null = null;
function atlasGraph(): AtlasGraph {
  if (cachedGraph === null) cachedGraph = buildGraph(readPosts());
  return cachedGraph;
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: atlasGraph().nodes.map((n) => ({ params: { id: n.id.split("/") } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<AtlasNodeDetail> = async (ctx) => {
  const parts = ctx.params?.id;
  const id = Array.isArray(parts) ? parts.join("/") : String(parts ?? "");
  const props = nodeDetailProps(atlasGraph(), id);

  // `fallback: false` + `getStaticPaths` 가 그래프에서 뽑은 경로뿐이라 여기는 닿지 않는다.
  // `notFound` 대신 던지는 이유: 정적 export 에서 조용히 페이지가 빠지는 것보다
  // 빌드가 서는 편이 낫다 — 없어진 페이지는 아무도 안 본다.
  if (props === null) throw new Error(`아틀라스 노드를 찾지 못했다: ${id}`);

  return { props };
};

export default function AtlasNodePage({ node, neighbors }: AtlasNodeDetail) {
  return (
    <>
      <SiteHead
        title={`${node.title} — 지식 아틀라스`}
        description={node.summary}
        path={`/atlas/${node.id}/`}
      />

      <SiteShell>
        <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <nav aria-label="상위 이동" className="mb-8">
            <Link
              href="/atlas/"
              className="text-label uppercase tracking-widest text-n6 underline underline-offset-4 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n0"
            >
              ← 지식 아틀라스
            </Link>
          </nav>

          {/* 노드 제목이 곧 페이지 제목이라 `h1` 로 낸다 — 이 리포 상세 페이지들의 규칙이다. */}
          <NodePanel node={node} neighbors={neighbors} titleAs="h1" />
        </div>
      </SiteShell>
    </>
  );
}
