// 빌드 후 out/ 을 스캔해 sitemap.xml을 만든다.
// public/sitemap.xml을 손으로 관리하면 글이 늘어날 때마다 빠뜨린다.
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "out");
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://withwooyong.github.io";

/**
 * 색인에서 뺄 경로. /notion/은 meta refresh 리다이렉트라 넣지 않는다.
 *
 * `(\/|$)`가 필요하다. `/^product-lead-wiki\//` 처럼 슬래시를 강제하면 하위 문서
 * (product-lead-wiki/cms)만 걸러지고 인덱스 라우트(product-lead-wiki) 자체는 통과해
 * 리다이렉트 스텁이 sitemap에 실린다.
 */
// 아틀라스는 목록(/atlas/)만 남기고 노드 상세 162개는 뺀다.
// 노드 상세는 글의 요약과 연결만 담아 원문(/blog/**)과 중복 색인되기 때문이다.
//
// ⚠️ `/^atlas\/.+/` 다. `/^atlas(\/|$)/` 로 쓰면 꼬리가 빈 `atlas` 자신까지 걸려 목록마저 사라진다.
// `product-lead*` 4 규칙은 T13 이 접은 **리다이렉트 스텁 9 URL** 을 통째로 뺀다.
//   - `product-lead` · `product-lead-v2` · `product-lead-loadmap` → public/ 아래 손으로 쓴 정적 HTML
//   - `product-lead-wiki` (6 URL) → pages/product-lead-wiki/{index,[slug]}.tsx 의 Next 스텁
// 셋 다 out/ 스캔에 그대로 잡히므로 여기서 빼지 않으면 「/work/ 로 튕기는 빈 페이지」가 sitemap 에 실린다.
//
// ⚠️ 스텁에는 `noindex` 가 **없다**(있으면 canonical 로 묶인 /work/ 까지 색인에서 빠질 수 있다).
//    즉 이 EXCLUDE 가 검색엔진에 그 9 URL 을 내밀지 않는 **유일한 장치**다. 지우지 마라.
//    (예전 주석의 「위키·로드맵은 noindex」는 T13 이전 이야기다.)
const EXCLUDE = [
  /^product-lead(\/|$)/,
  /^product-lead-v2(\/|$)/,
  /^product-lead-wiki(\/|$)/,
  /^product-lead-loadmap(\/|$)/,
  /^notion(\/|$)/,
  /^404$/,
  /^atlas\/.+/,
];

/**
 * 경로별 우선순위. 앞에서 매칭되는 첫 규칙을 쓴다.
 *
 * 그래서 좁은 규칙(blog/tags)을 넓은 규칙(blog/<무엇이든>)보다 먼저 둬야 한다.
 * 뒤에 두면 blog/tags는 카테고리 규칙에, blog/tags/<태그>는 포스트 규칙에 먼저 걸려
 * 목록 페이지가 실제 글과 같은 우선순위를 갖는다.
 */
const PRIORITY = [
  [/^$/, "1.0"],
  [/^blog$/, "0.9"],
  [/^blog\/tags(\/|$)/, "0.4"],
  [/^blog\/[^/]+$/, "0.7"],
  [/^blog\/[^/]+\/[^/]+$/, "0.8"],
];

function collect(dir, prefix = "") {
  const urls = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("_")) continue;

    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const child = path.join(dir, entry.name);

    if (fs.existsSync(path.join(child, "index.html"))) urls.push(rel);
    urls.push(...collect(child, rel));
  }
  return urls;
}

function priorityOf(route) {
  for (const [pattern, value] of PRIORITY) {
    if (pattern.test(route)) return value;
  }
  return "0.6";
}

const routes = ["", ...collect(OUT)]
  .filter((r) => !EXCLUDE.some((p) => p.test(r)))
  .sort();

const today = new Date().toISOString().slice(0, 10);

const body = routes
  .map((r) => {
    const loc = r ? `${ORIGIN}/${r}/` : `${ORIGIN}/`;
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      "    <changefreq>monthly</changefreq>",
      `    <priority>${priorityOf(r)}</priority>`,
      `    <lastmod>${today}</lastmod>`,
      "  </url>",
    ].join("\n");
  })
  .join("\n");

fs.writeFileSync(
  path.join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
  "utf8"
);

console.log(`[sitemap] ${routes.length}개 URL 생성`);
