/**
 * Pagefind 런타임 로더.
 *
 * `/pagefind/pagefind.js` 는 `next build` **뒤에** `npx pagefind --site out` 이 만든다.
 * 즉 번들 시점에는 존재하지 않는 파일이므로, 번들러나 타입체커가 이 import 를
 * 해석하려 들면 죽는다.
 *
 * `import(/* webpackIgnore: true *\/ "/pagefind/pagefind.js")` 를 먼저 썼으나
 * `npx tsc --noEmit` 이 TS2307 로 거부했다:
 *   lib/search/pagefind-loader.ts(40,45): error TS2307:
 *   Cannot find module '/pagefind/pagefind.js' or its corresponding type declarations.
 * `types/pagefind.d.ts` 에 `declare module "/pagefind/pagefind.js";` 를 두어도 그대로다.
 * (`tsc --listFiles` 로 그 d.ts 가 프로그램에 들어간 것은 확인했다 —
 *  TypeScript 가 `/` 로 시작하는 이름을 **루트 경로**로 보아 ambient 선언을 적용하지
 *  않는 것이라, 선언 파일로는 못 고친다.)
 *
 * 그래서 Function 생성자 안에 넣는다. 문자열 안의 import 는 번들러도 tsc 도 파싱하지
 * 않으므로 양쪽 모두를 통과한다. `new Function` 은 브라우저 분기 **안에서** 만든다 —
 * 모듈 평가만으로 eval 을 건드리지 않게.
 *
 * 정적 export(`output: "export"`) 라 이 모듈은 빌드 중에도 평가된다 —
 * 브라우저가 아니면 import 를 시도하지 않고 즉시 reject 한다.
 */

export type PagefindData = {
  url: string;
  excerpt: string;
  meta: { title?: string } & Record<string, string | undefined>;
};

export type PagefindResult = {
  id: string;
  data: () => Promise<PagefindData>;
};

export type PagefindApi = {
  search: (query: string) => Promise<{ results: PagefindResult[] }>;
  options?: (opts: Record<string, unknown>) => Promise<void>;
};

/** 브라우저 세션당 1회만 로드한다. 실패하면 비워서 재시도를 허용한다. */
let cached: Promise<PagefindApi> | null = null;

export function loadPagefind(): Promise<PagefindApi> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("loadPagefind: 브라우저에서만 호출할 수 있다"),
    );
  }

  if (cached) return cached;

  let pending: Promise<PagefindApi>;
  try {
    const importPagefind = new Function(
      'return import("/pagefind/pagefind.js")',
    ) as () => Promise<unknown>;

    pending = importPagefind()
      .then(function (mod) {
        return mod as PagefindApi;
      })
      .catch(function (err) {
        // 실패를 캐시하면 새로고침 전까지 영영 검색이 죽는다.
        cached = null;
        throw err;
      });
  } catch (err) {
    // CSP 가 `unsafe-eval` 을 막으면 **Function 생성자 자체가 동기 예외**를 던진다.
    // 반환 타입이 Promise 인 이상 동기 throw 는 계약 위반이다 — `.catch()` 로 잇는
    // 호출부가 하나만 생겨도 터진다. (이 리포에 오늘 CSP 는 없다. 계약을 지키는 것뿐.)
    return Promise.reject(err);
  }

  cached = pending;
  return pending;
}
