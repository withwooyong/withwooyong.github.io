import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * 블로그 파싱 로직의 단위 테스트 설정.
 *
 * 테스트 대상은 frontmatter 검증·목차 생성·파일 스캔뿐이라 DOM이 필요 없다.
 * jsdom을 넣으면 설치 용량만 늘어난다.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  /**
   * .tsx 를 테스트에서 import 하기 위한 JSX 변환 설정.
   *
   * tsconfig.json 이 jsx: "preserve" 라 변환기가 JSX 를 그대로 두고, vite 의
   * import-analysis 가 "Failed to parse source ... contains invalid JS syntax" 로 죽는다.
   * tsconfig 는 동결이므로 여기서만 덮는다 — 페이지의 getStaticProps 를 테스트가 직접
   * 불러야 하기 때문이다(lib 만 검사하면 페이지의 페이로드 회귀를 못 잡는다).
   *
   * ⚠️ 키가 `esbuild` 가 **아니다.** 이 리포의 vite 는 8.x(rolldown/oxc)라 esbuild 를
   *    쓰지 않는다. `esbuild: { jsx: "automatic" }` 을 넣으면 **조용히 무시되고**
   *    같은 파싱 오류가 그대로 난다 — 실측으로 확인했다. 설정이 안 먹은 것과
   *    설정이 틀린 것이 같은 오류 문구로 나오니 키를 바꿔 가며 추측하지 마라.
   */
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
