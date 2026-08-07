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
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
