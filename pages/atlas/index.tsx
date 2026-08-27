import { useMemo, useState } from "react";
import type { GetStaticProps } from "next";
import { DotRenderer } from "@/components/atlas/dot-renderer";
import { ListView } from "@/components/atlas/list-view";
import { NodePanel } from "@/components/atlas/node-panel";
import { SiteHead } from "@/components/site-head";
import { SiteShell } from "@/components/site-shell";
import { buildGraph } from "@/lib/atlas/build";
import { neighborsOf } from "@/lib/atlas/neighbors";
import type { AtlasGraph } from "@/lib/atlas/types";
import { readPosts } from "@/lib/blog/loader";

/**
 * 지식 아틀라스. 설계서 §7 · 계획서 T11.
 *
 * 그래프는 **빌드 시점에** `getStaticProps` 에서 만든다 — 정적 export 라 여기가 빌드타임이고
 * `@/lib/blog/loader` 의 파일 읽기도 그대로 동작한다. `graph.json` 을 따로 둘 이유가 없다.
 *
 * ⚠️ **`SiteShell` 은 `children` 만 받는다.** 계획서 초안의 `<SiteShell title=… description=…>`
 *    는 `tsc` 에서 죽는다. `<head>` 는 `SiteHead` 가 따로 맡는다 —
 *    `pages/blog/index.tsx` 가 쓰는 조합이 그것이고, 여기도 같게 둔다.
 *
 * ⚠️ **`graph` 는 props 그대로 넘긴다.** `graph={{ ...graph }}` 로 새 객체를 만들면
 *    `DotRenderer`·`ListView` 안의 `useMemo([graph])` 가 매 렌더 무효화돼 162 노드의
 *    레이아웃 계산이 선택할 때마다 다시 돈다. 참조가 그대로여야 메모가 산다.
 */
export const getStaticProps: GetStaticProps<{ graph: AtlasGraph }> = async () => ({
  // 슬림화(엣지 note 제거 등)는 하지 않는다. 실측 226,605 → 216,543B 로 **4.4% 뿐**이고
  // (그래프의 51% 가 엣지다) 이 페이지는 1개라 레버가 아니다. 대신 컴포넌트 3개의 계약이
  // 흔들린다. 페이로드가 걸린 자리는 노드 상세 162개 쪽이고, 거기는 `nodeDetailProps` 가 맡는다.
  props: { graph: buildGraph(readPosts()) },
});

export default function AtlasPage({ graph }: { graph: AtlasGraph }) {
  const [selected, setSelected] = useState<string | null>(null);

  const node = useMemo(
    () => (selected == null ? null : (graph.nodes.find((n) => n.id === selected) ?? null)),
    [graph, selected]
  );
  const neighbors = useMemo(
    () => (selected == null ? [] : neighborsOf(graph, selected)),
    [graph, selected]
  );

  return (
    <>
      <SiteHead
        title="지식 아틀라스"
        description={`글 ${graph.meta.counts.artifact}편과 토픽 ${graph.meta.counts.concept}개를 연결 ${graph.edges.length}개로 이은 지식 그래프.`}
        path="/atlas/"
      />

      <SiteShell>
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="text-section font-bold text-n9 break-keep">지식 아틀라스</h1>
          <p className="mt-2 text-body text-n7 break-keep">
            글 {graph.meta.counts.artifact}편 · 토픽 {graph.meta.counts.concept}개 · 연결{" "}
            {graph.edges.length}개
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
            {/*
              모션이 없는 정적 SVG 라 `prefers-reduced-motion` 에서도 그대로 둔다.
              설계서 §7.7 의 플로차트는 이 미디어쿼리로 그래프와 목록 **둘 중 하나**를
              고르게 그려져 있는데, 그대로 구현하면 no-preference 기기에서 페이지의
              키보드 경로가 **0 이 된다**(WCAG 2.1.1) — `DotRenderer` 는 포인터 전용이다.
              분기를 「그래프를 보일지 말지」로 읽고, 아래 목록은 **항상** 싣는다.
            */}
            <div className="aspect-square w-full rounded-lg border border-n4 bg-n1 p-2">
              <DotRenderer graph={graph} selected={selected} onSelect={setSelected} />
            </div>

            <aside className="lg:sticky lg:top-24 lg:h-fit" aria-label="선택한 노드">
              {node ? (
                <NodePanel node={node} neighbors={neighbors} />
              ) : (
                <p className="text-body text-n6 break-keep">
                  아래 목록에서 글을 고르면 여기에 상세가 나옵니다.
                </p>
              )}
            </aside>
          </div>

          {/*
            키보드·스크린리더의 **유일한** 경로다. `sr-only role="status"` 라이브 영역도
            `ListView` 안에 하나 있다 — `DotRenderer` 에 하나 더 두면 한 번의 선택이
            두 번 낭독된다.
          */}
          <section className="mt-16" aria-labelledby="atlas-list-heading">
            <h2 id="atlas-list-heading" className="text-card-title font-semibold text-n9 break-keep">
              전체 목록
            </h2>
            <div className="mt-6">
              <ListView graph={graph} selected={selected} onSelect={setSelected} />
            </div>
          </section>
        </div>
      </SiteShell>
    </>
  );
}
