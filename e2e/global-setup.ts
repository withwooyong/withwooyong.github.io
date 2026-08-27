import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * out/ 이 없거나 소스보다 오래됐으면 **테스트를 시작하지 않는다.**
 *
 * 이 스위트는 dev 서버가 아니라 **빌드 산출물**을 서빙한다(정적 export 라 그래야 한다).
 * 그래서 `npm run build` 를 빼먹고 `npm run e2e` 만 돌리면 **직전 산출물을 상대로**
 * 검사가 돈다 — 방금 고친 것도, 방금 깨뜨린 것도 결과에 안 나타난다.
 * 초록이 「통과」가 아니라 「어제 것을 봤다」는 뜻이 되는데, 그 둘이 화면에서 똑같이 생겼다.
 *
 * 이 리포가 반복해서 데인 「증명되지 않은 0」과 같은 구조다(CLAUDE.md 의 게이트 절).
 * 그래서 조용히 넘어가지 않고 여기서 끊는다.
 */

const ROOT = resolve(__dirname, "..");
const OUT = join(ROOT, "out");

/**
 * 화면에 영향을 주는 소스. 여기 것이 out/ 보다 새로우면 산출물은 낡은 것이다.
 *
 * ⚠️ 「코드」만 넣지 마라. 2026-08-26 실측: 처음에 components·pages·data·lib·styles 만
 *    넣었더니 `public/favicon.svg` 와 `scripts/generate-sitemap.mjs` 를 소스보다 새로 만들어도
 *    가드가 안 걸렸다(종료코드 0). 같은 방식으로 `components/` 를 만졌을 때는 걸렸으므로
 *    가드가 죽은 게 아니라 **목록에 구멍이 있었다.** 빌드 산출물을 바꾸는 것은 전부 넣는다.
 */
const SOURCES = [
  "components",
  "pages",
  "data",
  "lib",
  "styles",
  "content", // 블로그 156편 — 고치고 빌드를 빼먹으면 낡은 글을 검사하게 된다
  "public", // 이미지·favicon 은 out/ 으로 복사된다
  "scripts", // generate-sitemap.mjs 가 out/sitemap.xml 을 만든다
  "next.config.js",
  "tailwind.config.js",
  "postcss.config.js",
  "package.json", // 의존성이 바뀌면 번들도 바뀐다
];

/** 가장 최근 수정 시각(ms). 디렉터리면 재귀한다. */
function newestMtime(path: string): number {
  if (!existsSync(path)) return 0;
  const stat = statSync(path);
  if (!stat.isDirectory()) return stat.mtimeMs;
  let newest = stat.mtimeMs;
  for (const entry of readdirSync(path)) {
    newest = Math.max(newest, newestMtime(join(path, entry)));
  }
  return newest;
}

export default function globalSetup(): void {
  if (!existsSync(join(OUT, "index.html"))) {
    throw new Error(
      [
        "out/index.html 이 없다 — 검사할 산출물이 없다.",
        "",
        "  npm run build",
        "",
        "serve 는 없는 디렉터리에도 오류 없이 뜨고 전부 404 를 낸다.",
        "그 404 를 「라우트가 없다」로 읽으면 T10~T12 의 목표를 잘못 판정하게 된다.",
      ].join("\n"),
    );
  }

  /*
   * ⚠️ 기준 시각이 out/index.html 하나라, **이 파일을 손으로 만지면 기준이 지금으로 밀린다.**
   *    산출물을 직접 변이시켜 검사기를 시험하는 작업(이 리포에서 실제로 한다)이 끝난 뒤에는
   *    가드가 한동안 무력해진다. 그런 실험 뒤에는 다시 빌드하고 나서 결과를 믿어라.
   */
  const built = statSync(join(OUT, "index.html")).mtimeMs;
  const source = Math.max(...SOURCES.map((s) => newestMtime(join(ROOT, s))));

  if (source > built) {
    const behind = Math.round((source - built) / 1000);
    throw new Error(
      [
        `out/ 이 소스보다 ${behind}초 오래됐다 — 낡은 산출물을 검사하려 하고 있다.`,
        "",
        "  npm run build && npm run e2e",
        "",
        "이 스위트는 out/ 을 서빙한다. 빌드 없이 돌리면 방금 고친 것도 깨뜨린 것도",
        "결과에 나타나지 않고, 초록이 「통과」가 아니라 「어제 것을 봤다」는 뜻이 된다.",
      ].join("\n"),
    );
  }
}
