import { findCategory } from "@/content/blog/categories";
import type { PostFrontmatter } from "@/lib/blog/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TAGS = 6;

/**
 * frontmatter를 검증한다. 위반하면 던진다 — 빌드가 실패해야 잘못된 글이 발행되지 않는다.
 *
 * 조용히 기본값을 채우지 않는 것이 이 함수의 방침이다. 기본값은 실수를 감추고,
 * 감춰진 실수는 발행된 뒤에 발견된다.
 */
export function validateFrontmatter(data: unknown, file: string): PostFrontmatter {
  const fail = (msg: string): never => {
    throw new Error(`[frontmatter] ${file}: ${msg}`);
  };

  if (typeof data !== "object" || data === null) return fail("frontmatter가 객체가 아닙니다");
  const d = data as Record<string, unknown>;

  const str = (key: string): string => {
    const v = d[key];
    if (typeof v !== "string" || v.trim() === "") fail(`${key}는 비어 있지 않은 문자열이어야 합니다`);
    return v as string;
  };

  const bool = (key: string): boolean => {
    const v = d[key];
    if (typeof v !== "boolean") fail(`${key}는 true 또는 false로 명시해야 합니다`);
    return v as boolean;
  };

  const title = str("title");
  const description = str("description");
  const category = str("category");
  const date = str("date");

  if (!DATE.test(date)) fail(`date는 YYYY-MM-DD 형식이어야 합니다 (받은 값: ${date})`);
  if (!findCategory(category)) fail(`알 수 없는 카테고리입니다: ${category}`);

  const tags = d.tags;
  if (!Array.isArray(tags) || tags.length === 0) fail("tags는 1개 이상이어야 합니다");
  if ((tags as unknown[]).length > MAX_TAGS) fail(`tags는 ${MAX_TAGS}개 이하여야 합니다`);
  if ((tags as unknown[]).some((t) => typeof t !== "string" || t.trim() === "")) {
    fail("tags의 각 항목은 비어 있지 않은 문자열이어야 합니다");
  }

  const featured = bool("featured");
  const draft = bool("draft");

  const updated = d.updated === undefined ? undefined : str("updated");
  if (updated !== undefined && !DATE.test(updated)) fail("updated는 YYYY-MM-DD 형식이어야 합니다");

  const series = d.series === undefined ? undefined : str("series");
  let seriesOrder: number | undefined;
  if (series !== undefined) {
    if (typeof d.seriesOrder !== "number") fail("series가 있으면 seriesOrder(숫자)가 필요합니다");
    seriesOrder = d.seriesOrder as number;
  }

  const source = d.source === undefined ? undefined : str("source");

  return {
    title,
    description,
    category,
    tags: tags as string[],
    date,
    featured,
    draft,
    // 값이 없는 선택 필드는 키 자체를 만들지 않는다.
    // Next.js는 getStaticProps props를 JSON으로 직렬화하는데 JSON에 undefined가 없어,
    // `updated: undefined` 같은 키가 남아 있으면 빌드가 실패한다.
    //   Error serializing `.post.series` ... `undefined` cannot be serialized as JSON.
    ...(updated !== undefined && { updated }),
    ...(series !== undefined && { series, seriesOrder }),
    ...(source !== undefined && { source }),
  };
}
