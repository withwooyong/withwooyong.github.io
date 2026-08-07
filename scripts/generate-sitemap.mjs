// 빌드 후 out/ 을 스캔해 sitemap.xml을 만든다.
// public/sitemap.xml을 손으로 관리하면 글이 늘어날 때마다 빠뜨린다.
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "out");
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://withwooyong.github.io";

/**
 * 색인에서 뺄 경로. 위키·로드맵은 noindex, /notion/은 meta refresh 리다이렉트라 넣지 않는다.
 *
 * `(\/|$)`가 필요하다. `/^product-lead-wiki\//` 처럼 슬래시를 강제하면 하위 문서
 * (product-lead-wiki/cms)만 걸러지고 인덱스 라우트(product-lead-wiki) 자체는 통과해
 * noindex 페이지가 sitemap에 실린다.
 */
const EXCLUDE = [/^product-lead-wiki(\/|$)/, /^product-lead-loadmap(\/|$)/, /^notion(\/|$)/, /^404$/];

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
