import { describe, expect, it } from "vitest";
import { readPosts } from "@/lib/blog/loader";
import { headingIds } from "@/lib/toc";
import { outboundKeys, postKey, proseOnly } from "@/lib/atlas/links";

/**
 * 링크 지형 검사.
 *
 * 「링크는 참조가 아니라 약속이다」(금지선 45). 대상이 사라지면 약속이 깨지고,
 * 들어오는 링크가 없는 편은 발행돼 있어도 아무도 도달하지 못한다 —
 * search-engineering 6편이 카테고리째 고립됐던 것이 그 경우다.
 */

/**
 * ⚠️ `outboundKeys` · `postKey` 는 2026-08-26 에 `lib/atlas/links.ts` 로 승격됐다.
 *    아틀라스의 엣지 생성이 **같은 함수**를 쓴다 — 따로 구현하면 그때부터
 *    검사와 엣지가 어긋날 수 있다(설계서 §7.4). 정규식을 고칠 일이 있으면 그쪽에서 고쳐라.
 *    여기서 다시 정의하지 마라.
 */

const posts = readPosts();
const published = new Set(posts.map(postKey));

describe("링크 무결성", () => {
  it("발행본을 읽었다", () => {
    // 0편이면 아래 검사가 전부 공허참이 된다.
    expect(posts.length).toBeGreaterThan(0);
  });

  it("내부 링크의 대상이 전부 실재한다", () => {
    const dead: string[] = [];
    for (const post of posts) {
      for (const target of outboundKeys(post)) {
        if (!published.has(target)) dead.push(`${postKey(post)} -> ${target}`);
      }
    }
    expect(dead, `죽은 링크 ${dead.length}건`).toEqual([]);
  });

  it("내부 링크가 슬래시로 끝난다", () => {
    // trailingSlash: true 이므로 슬래시가 없으면 리다이렉트가 한 번 더 돈다.
    const bad: string[] = [];
    for (const post of posts) {
      // 링크 전체를 잡은 뒤 경로부와 앵커·질의부를 갈라 본다. #·? 를 문자 클래스에서
      // 배제하면(구판 `[^)#?]*`) 앵커 링크는 매칭 자체가 실패해 검사를 통째로 빠져나간다 —
      // `/blog/rag/foo#s` 같은 진짜 위반이 조용히 통과한다.
      // proseOnly — 코드 펜스 안의 「슬래시 빠뜨리면 안 된다」 예시가 가짜 위반으로 잡히면
      // 고칠 수 없는 빨강이 된다. outboundKeys 와 같은 전처리를 본다.
      for (const m of Array.from(proseOnly(post.body).matchAll(/\]\((\/blog\/[^)]*)\)/g))) {
        const href = m[1];
        const path = href.split(/[#?]/)[0];
        // 판정은 경로부로, 보고는 원본 전체로. 경로부만 적으면 파일에서 찾지 못한다.
        if (!path.endsWith("/")) bad.push(`${postKey(post)}: ${href}`);
      }
    }
    expect(bad, `슬래시 누락 ${bad.length}건`).toEqual([]);
  });
});

describe("링크 고립", () => {
  it("들어오는 링크가 없는 편이 없다 (지도편 제외)", () => {
    const inbound = new Map<string, number>(posts.map((p) => [postKey(p), 0]));

    for (const post of posts) {
      // 같은 편을 여러 번 가리켜도 관계는 하나다.
      for (const target of Array.from(new Set(outboundKeys(post)))) {
        if (target === postKey(post)) continue;
        if (inbound.has(target)) inbound.set(target, inbound.get(target)! + 1);
      }
    }

    // 지도편은 카테고리 전체를 가리키는 것이 목적이라 inbound 0이 정상이다.
    const maps = new Set(posts.filter((p) => p.role === "map").map(postKey));
    const isolated = Array.from(inbound)
      .filter(([k, n]) => n === 0 && !maps.has(k))
      .map(([k]) => k);

    expect(isolated, `고립 ${isolated.length}편`).toEqual([]);
  });
});

/**
 * 카테고리 고립 검사.
 *
 * 위의 편 단위 검사를 통과해도 카테고리가 통째로 떨어져 나갈 수 있다 —
 * 한 카테고리 안에서 서로만 링크하면 편마다 inbound는 1 이상이지만
 * 바깥에서 그 카테고리로 들어오는 길은 없다. search-engineering 6편이 그랬다.
 *
 * 판정 기준을 **비율이 아니라 연결성**으로 잡는다. 「카테고리 간 링크가 전체의 N%」
 * 같은 임계는 배치마다 분모가 달라져 새 글을 낼 때마다 깨진다.
 * 나가는 길 하나와 들어오는 길 하나 — 이건 배치 크기와 무관하게 참이어야 한다.
 *
 * 방향을 둘 다 요구하는 이유: out만 보면 「참조는 하는데 아무도 안 찾는」 카테고리를
 * 못 잡고, in만 보면 「받기만 하고 내보내지 않는」 막다른 카테고리를 못 잡는다.
 */

type Node = { cat: string; id: string; links: string[] };

/** 카테고리 간 간선을 세어 한 방향이라도 0인 카테고리를 돌려준다. */
function brokenCategories(nodes: Node[]): string[] {
  const catOf = new Map<string, string>(nodes.map((n) => [n.id, n.cat]));
  const cats = Array.from(new Set(nodes.map((n) => n.cat))).sort();
  const out = new Map<string, number>(cats.map((c) => [c, 0]));
  const inn = new Map<string, number>(cats.map((c) => [c, 0]));

  for (const n of nodes) {
    for (const target of Array.from(new Set(n.links))) {
      const to = catOf.get(target);
      // 대상이 실재하지 않는 링크는 위의 「대상이 전부 실재한다」가 잡는다.
      if (!to || to === n.cat) continue;
      out.set(n.cat, out.get(n.cat)! + 1);
      inn.set(to, inn.get(to)! + 1);
    }
  }

  return cats
    .filter((c) => out.get(c)! === 0 || inn.get(c)! === 0)
    .map((c) => `${c} (나감 ${out.get(c)} · 들어옴 ${inn.get(c)})`);
}

describe("카테고리 고립", () => {
  // 「0건」을 믿기 전에 이 검사가 실제로 무언가를 잡는지 먼저 보인다.
  // 통과한 검사와 아무것도 안 하는 검사는 출력이 같기 때문이다.
  it("자기검사 — 끊긴 지형을 실제로 잡는다", () => {
    const ok: Node[] = [
      { cat: "a", id: "a/1", links: ["b/1"] },
      { cat: "b", id: "b/1", links: ["a/1"] },
    ];
    expect(brokenCategories(ok)).toEqual([]);

    // ① 안에서만 서로 링크한다 — 편 단위 고립 검사는 통과하지만 카테고리는 떨어져 있다.
    const inward: Node[] = [
      { cat: "a", id: "a/1", links: ["b/1"] },
      { cat: "b", id: "b/1", links: ["a/1"] },
      { cat: "z", id: "z/1", links: ["z/2"] },
      { cat: "z", id: "z/2", links: ["z/1"] },
    ];
    expect(brokenCategories(inward)).toEqual(["z (나감 0 · 들어옴 0)"]);

    // ② 내보내기만 한다 — 아무도 찾아오지 않는 카테고리.
    const noIn: Node[] = [
      { cat: "a", id: "a/1", links: ["b/1"] },
      { cat: "b", id: "b/1", links: ["a/1"] },
      { cat: "z", id: "z/1", links: ["a/1"] },
    ];
    expect(brokenCategories(noIn)).toEqual(["z (나감 1 · 들어옴 0)"]);

    // ③ 받기만 한다 — 막다른 카테고리.
    const noOut: Node[] = [
      { cat: "a", id: "a/1", links: ["b/1", "z/1"] },
      { cat: "b", id: "b/1", links: ["a/1"] },
      { cat: "z", id: "z/1", links: [] },
    ];
    expect(brokenCategories(noOut)).toEqual(["z (나감 0 · 들어옴 1)"]);

    // ④ 같은 카테고리 안의 링크는 간선으로 세지 않는다.
    const selfOnly: Node[] = [
      { cat: "a", id: "a/1", links: ["a/2"] },
      { cat: "a", id: "a/2", links: ["a/1"] },
    ];
    expect(brokenCategories(selfOnly)).toEqual(["a (나감 0 · 들어옴 0)"]);

    // ⑤ 실재하지 않는 대상은 간선을 만들지 못한다 — 죽은 링크로 연결성을 위조할 수 없다.
    const dead: Node[] = [
      { cat: "a", id: "a/1", links: ["b/1"] },
      { cat: "b", id: "b/1", links: ["a/1"] },
      { cat: "z", id: "z/1", links: ["a/999"] },
    ];
    expect(brokenCategories(dead)).toEqual(["z (나감 0 · 들어옴 0)"]);
  });

  it("모든 카테고리가 바깥과 양방향으로 이어져 있다", () => {
    const nodes: Node[] = posts.map((p) => ({
      cat: p.categorySlug,
      id: postKey(p),
      links: outboundKeys(p).filter((t) => published.has(t)),
    }));

    const broken = brokenCategories(nodes);
    expect(broken, `카테고리 고립 ${broken.length}건`).toEqual([]);
  });
});

/**
 * 앵커 실존 검사.
 *
 * 위의 「대상이 전부 실재한다」는 편까지만 본다. `#앵커`가 가리키는 **절**이 사라져도
 * 링크는 그 검사를 통과하고, 독자는 편의 맨 위로 떨어진다. 절 제목은 편 이름보다
 * 훨씬 자주 바뀌므로 실제로 깨지는 쪽은 이쪽이다.
 *
 * 도착지 집합은 `lib/toc.ts`의 `headingIds`에서 가져온다. **여기서 다시 계산하지 마라** —
 * 검사기가 렌더러와 다르게 슬러그하면 거짓 0과 거짓 양성을 동시에 낸다.
 */

type Doc = { id: string; body: string };
type AnchorLink = { from: string; target: string; anchor: string };

/**
 * 앵커가 붙은 내부 링크를 전부 뽑는다.
 *
 * `brokenAnchors`와 「몇 건을 봤나」가 **같은 정규식**을 쓰게 하려고 갈라 놨다.
 * 따로 세면 정규식이 실제 링크 문법을 못 잡을 때 「0건 발견」과 「0건 검사」가
 * 구분되지 않는다 — 이 리포가 실제로 당한 거짓 0의 모양이다.
 */
function anchorLinks(docs: Doc[]): AnchorLink[] {
  const out: AnchorLink[] = [];

  for (const d of docs) {
    // proseOnly 는 **링크를 뽑는 이쪽에만** 넣는다. 대상 헤딩 쪽(brokenAnchors 의 headingIds)에
    // 넣으면 인라인 코드가 든 헤딩의 id 가 바뀐다 — 아래 「모든 앵커 링크가…」 주석 참조.
    for (const m of Array.from(proseOnly(d.body).matchAll(/\]\(\/blog\/([^)#?]+?)\/?#([^)]+)\)/g))) {
      // 브라우저는 %-인코딩된 앵커도 디코드해 맞춘다. 한글 앵커가 인코딩된 채
      // 적혀 있으면 원문과 글자가 달라 보이므로 여기서도 디코드한다.
      // 망가진 인코딩(`%zz`)은 throw하므로 원문 그대로 두고 불일치로 잡히게 둔다.
      let anchor = m[2];
      try {
        anchor = decodeURIComponent(anchor);
      } catch {
        /* 원문 유지 */
      }
      out.push({ from: d.id, target: m[1].replace(/\/$/, ""), anchor });
    }
  }

  return out;
}

/** 앵커가 붙은 내부 링크 중 대상 편의 헤딩에 닿지 못하는 것을 돌려준다. */
function brokenAnchors(docs: Doc[]): string[] {
  const idsOf = new Map<string, Set<string>>(
    docs.map((d) => [d.id, new Set(headingIds(d.body))]),
  );

  return anchorLinks(docs)
    .filter((l) => {
      const ids = idsOf.get(l.target);
      // 대상 편 자체가 없는 것은 위의 「대상이 전부 실재한다」 소관이다.
      // 여기서 함께 잡으면 한 결함이 두 번 보고돼 어느 쪽을 고칠지가 흐려진다.
      return ids ? !ids.has(l.anchor) : false;
    })
    .map((l) => `${l.from} -> ${l.target}#${l.anchor}`);
}

describe("앵커 실존", () => {
  // 「0건」을 믿기 전에 이 검사가 실제로 무언가를 잡는지 먼저 보인다.
  it("자기검사 — 닿지 않는 앵커를 실제로 잡는다", () => {
    // 실제 링크는 `/blog/<카테고리>/<슬러그>/#앵커` 꼴이다 — 슬래시는 앵커 **앞**에 온다.
    const link = (to: string) => `본문 [보기](/blog/${to}) 끝.`;

    // ① 있는 앵커는 통과한다.
    expect(
      brokenAnchors([
        { id: "c/a", body: "## 어떤 절\n" + link("c/b/#다른-절") },
        { id: "c/b", body: "## 다른 절\n" },
      ]),
    ).toEqual([]);

    // ② 없는 앵커를 잡는다.
    expect(
      brokenAnchors([
        { id: "c/a", body: link("c/b/#사라진-절") },
        { id: "c/b", body: "## 다른 절\n" },
      ]),
    ).toEqual(["c/a -> c/b#사라진-절"]);

    // ③ 강조·인라인 코드는 렌더링되면 사라진다. 기호를 뗀 텍스트가 id가 된다.
    expect(
      brokenAnchors([
        { id: "c/a", body: link("c/b/#굵은-코드-제목") },
        { id: "c/b", body: "## **굵은** `코드` 제목\n" },
      ]),
    ).toEqual([]);

    // ④ H4 이상에도 rehype-slug가 id를 붙인다. 목차(H2·H3)만 세면 이 앵커를
    //    「깨졌다」고 잘못 잡는다 — 이 검사기가 buildToc을 쓰지 않는 이유다.
    expect(
      brokenAnchors([
        { id: "c/a", body: link("c/b/#깊은-제목") },
        { id: "c/b", body: "## 얕은 제목\n\n#### 깊은 제목\n" },
      ]),
    ).toEqual([]);

    // ⑤ 슬러거는 상태를 들고 있다. 깊이로 걸러 낸 뒤 슬러그하면 H4가 세어지지 않아
    //    셋째 헤딩이 `-1`이 되고, 페이지의 `-2`를 가리키는 앵커가 깨진 것으로 잡힌다.
    expect(
      brokenAnchors([
        { id: "c/a", body: link("c/b/#같은-제목-2") },
        { id: "c/b", body: "## 같은 제목\n\n#### 같은 제목\n\n## 같은 제목\n" },
      ]),
    ).toEqual([]);

    // ⑥ 코드펜스 안의 `##`은 헤딩이 아니다. 그것을 가리키는 앵커는 어디에도 닿지 않는다.
    expect(
      brokenAnchors([
        { id: "c/a", body: link("c/b/#펜스-안-제목") },
        { id: "c/b", body: "## 진짜 제목\n\n```md\n## 펜스 안 제목\n```\n" },
      ]),
    ).toEqual(["c/a -> c/b#펜스-안-제목"]);

    // ⑦ %-인코딩된 앵커도 브라우저는 맞춘다. 디코드하지 않으면 멀쩡한 링크를 잡는다.
    expect(
      brokenAnchors([
        { id: "c/a", body: link("c/b/#%EA%B0%80%EB%82%98") },
        { id: "c/b", body: "## 가나\n" },
      ]),
    ).toEqual([]);

    // ⑧ 앵커가 없는 링크는 이 검사의 소관이 아니다. 여기서 잡으면 편 링크가 전부 걸린다.
    expect(
      brokenAnchors([
        { id: "c/a", body: link("c/b/") },
        { id: "c/b", body: "## 다른 절\n" },
      ]),
    ).toEqual([]);

    // ⑨ 대상 편이 아예 없는 링크도 이 검사의 소관이 아니다 — 「대상이 실재한다」가 잡는다.
    //    둘 다 잡으면 한 결함이 두 곳에서 보고돼 어느 쪽을 고칠지가 흐려진다.
    expect(
      brokenAnchors([{ id: "c/a", body: link("c/없는편/#어떤-절") }]),
    ).toEqual([]);
  });

  it("모든 앵커 링크가 대상 편의 헤딩에 닿는다", () => {
    // ⚠️ 여기서 proseOnly 를 쓰지 마라. `headingIds` 가 **헤딩 텍스트 그대로** id 를 만드는데,
    //    인라인 코드를 지우면 id 가 바뀐다 — 실측으로 확인했다:
    //    `## `master`/`slave` 표기는…` → `#master--slave-표기는-…` 이 계산되지 않아 앵커 2건이
    //    가짜로 끊겼다. 전처리는 **링크를 뽑는 쪽**(anchorLinks)에만 넣는다.
    const docs: Doc[] = posts.map((p) => ({ id: postKey(p), body: p.body }));

    // 하나도 못 뽑았다면 아래 「0건」은 깨끗하다는 뜻이 아니라 **안 봤다**는 뜻이다.
    // 자기검사는 합성 링크만 쓰므로 실제 문법을 놓치는 경우를 잡지 못한다.
    const seen = anchorLinks(docs);
    expect(seen.length, "발행본에서 앵커 링크를 하나도 뽑지 못했다").toBeGreaterThan(0);

    const broken = brokenAnchors(docs);
    expect(broken, `닿지 않는 앵커 ${broken.length}건 / 검사 ${seen.length}건`).toEqual([]);
  });
});
