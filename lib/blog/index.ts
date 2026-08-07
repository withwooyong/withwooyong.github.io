/**
 * 블로그 모듈 재수출.
 *
 * loader가 `node:fs`를 쓰므로 이 배럴을 컴포넌트에서 import하면 클라이언트 번들이 깨진다.
 * 페이지의 getStaticProps/getStaticPaths에서만 쓸 것. 컴포넌트는 `@/lib/blog/types`를
 * 직접 import한다.
 */
export * from "@/lib/blog/types";
export * from "@/lib/blog/loader";
export { validateFrontmatter } from "@/lib/blog/frontmatter";
