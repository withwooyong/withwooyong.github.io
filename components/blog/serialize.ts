/**
 * getStaticProps 반환값에서 `undefined`를 떨어뜨린다.
 *
 * 왜 필요한가 — `validateFrontmatter`는 선택 필드(updated·series·seriesOrder·source)를
 * 값이 없어도 키로 남기고 `undefined`를 넣는다. Next.js는 props를 __NEXT_DATA__에 JSON으로
 * 직렬화하는데 JSON에는 undefined가 없어, 조용히 넘어가지 않고 빌드를 실패시킨다.
 *
 *   Error serializing `.post.series` returned from `getStaticProps`
 *   Reason: `undefined` cannot be serialized as JSON.
 *
 * Post·PostSummary는 문자열·불리언·숫자·배열만 담으므로 직렬화 왕복에 손실이 없다.
 *
 * 근본 해법은 `lib/blog/frontmatter.ts`가 값이 없는 선택 필드의 키 자체를 만들지 않는 것이다.
 * 그쪽을 고치면 이 헬퍼는 지워도 된다.
 */
export function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
