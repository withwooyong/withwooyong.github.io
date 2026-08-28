// components/hero.tsx
//
// 스크롤로 문구가 바뀌는 히어로. 붙이는 것은 T10 이다 — 이 파일은 아직 어느 페이지에도
// import 되지 않는다.
//
// ⚠️ 이 컴포넌트의 접근성 구조는 **결함 [3] 의 처방**이다. 되돌리기 전에 아래 h1 주석을 읽어라.

import { HeroAtlas } from "@/components/hero-atlas";
import { activeLineIndex } from "@/lib/hero/motion";
import { useScrollProgress } from "@/lib/use-scroll-progress";
import { cn } from "@/lib/utils";

const EYEBROW = "20Y BACKEND · PLATFORM LEADER";

/** 히어로 문구 셋. 순서가 곧 스크롤 순서다. */
const LINES = [
  "20년간 만든 것은 서비스가 아니라 조직이었다.",
  "30명이 함께 굴린 교육·커머스 플랫폼. 두 번 다시 세운 검색.",
  "그 판단은 글 156편으로 남아 있다.",
] as const;

/** 지표. `value` 는 숫자를 포함하므로 tabular 로 자릿수 폭을 고정한다. */
const METRICS = [
  { value: "20년", label: "백엔드 · 플랫폼" },
  { value: "30명", label: "함께 굴린 조직" },
  { value: "156편", label: "남긴 글" },
] as const;

export function Hero() {
  const { ref, progress } = useScrollProgress<HTMLDivElement>();
  const active = activeLineIndex(progress, LINES.length);

  return (
    /*
      껍데기 300vh + 안쪽 sticky 100vh. 스크롤 거리(travel)는 200vh 이고,
      `scrollProgress()` 가 그 거리를 [0,1] 로 환산한다.

      ⚠️ 모션을 끈 사용자에게는 껍데기를 100vh 로 줄인다(motion-reduce 변종).
         그 경우 훅이 진행도를 1 로 고정하고 스크롤 리스너를 아예 걸지 않으므로,
         껍데기가 300vh 그대로면 나머지 200vh 동안 화면이 완전히 정지한 채
         **아무것도 변하지 않는 죽은 스크롤**이 된다.
    */
    <div ref={ref} className="relative h-[300vh] motion-reduce:h-screen">
      <section className="sticky top-0 flex h-screen items-center overflow-hidden bg-n0">
        <HeroAtlas progress={progress} />

        <div className="relative mx-auto w-full max-w-5xl px-6">
          <p className="text-label font-medium uppercase tracking-[0.08em] text-n6">{EYEBROW}</p>

          {/*
            ⚠️ h1 은 **하나뿐이고 세 문장 전체를 담는다.** 결함 [3] 의 처방이다.

            이전 구현은 h1 을 셋 만들고 비활성인 것에 aria-hidden 을 걸었다. 그러면
            reduced-motion 에서 진행도가 1 로 시작하므로 **페이지의 유일한 h1 이
            「그 판단은 글 156편으로 남아 있다.」** 가 된다 — 선행사가 없는 문장이
            페이지 제목이 되고, ①② 는 접근성 트리에 아예 없다.

            그래서 구조를 뒤집었다. 보조기술은 아래 sr-only 하나에서 **항상 완전한 세 문장**을
            읽고, 눈에 보이는 회전 레이어는 aria-hidden 으로 접근성 트리에서 빠진다.
            둘이 같은 h1 안에 있으므로 제목은 여전히 하나다.

            아래 dl 주석은 "sr-only 를 한 벌 더 두면 텍스트 선택자가 strict mode 위반"
            이라고 경고한다. h1 이 그 구조를 그대로 쓰면서도 괜찮은 이유는 **중복의 범위가
            다르기 때문**이다 — dl 이 걱정한 것은 `getByText("20년", { exact: true })` 처럼
            **완전 일치** 선택자가 후보 둘을 잡는 경우다. 여기서 sr-only 가 담는 것은
            세 문장을 이어 붙인 한 덩어리라 어떤 문장과도 완전 일치하지 않는다
            (e2e/hero.spec.ts 의 이름 매칭이 전부 `exact: true` 인 이유가 이것이다).
            대신 이 구조는 **드래그 선택** 쪽에서 대가를 치르므로 select-none 이 필요하다.
          */}
          <h1 className="mt-4 text-hero font-semibold text-n9 break-keep">
            {/*
              ⚠️ select-none(user-select:none) 이 접근성용이 아니라 **선택용**이다.
                 sr-only 는 clip 방식이라 화면에서만 사라질 뿐 텍스트 흐름에는 남는다 —
                 드래그 선택과 Ctrl+F 에 그대로 걸린다. 이게 없으면 h1 을 긁었을 때
                 세 문장 전부(84자) + 아래 시각 레이어의 활성 문장이 한 번 더,
                 즉 **활성 문장이 두 벌** 복사된다(이 리포 실측).
                 ⚠️ **고쳐지는 것은 드래그 복사뿐이다.** user-select:none 은 find-in-page 를
                    막지 않으므로 Ctrl+F 로 「156편」을 치면 보이지 않는 이 span 이 여전히 잡힌다.
                    그건 sr-only 의 정상 동작이라 결함이 아니다 — 다만 이 주석을 읽고
                    「Ctrl+F 도 해결됐다」고 믿지 마라.
                 스크린리더는 선택 API 를 쓰지 않으므로 접근성 트리는 그대로다 —
                 h1 의 접근명은 여전히 세 문장 전체이고 결함 [3] 의 처방은 깨지지 않는다.
            */}
            <span className="sr-only select-none">{LINES.join(" ")}</span>

            {/*
              시각 레이어. 세 문장이 **같은 그리드 칸**에 겹쳐 놓이므로 컨테이너 높이는
              언제나 「가장 긴 문장의 높이」로 고정된다 — 활성 문장이 바뀌어도 레이아웃이
              움직이지 않는다(CLS 0). min-h 는 그 위의 바닥값이다: 웹폰트가 스왑되기 전에는
              폴백 글꼴로 줄바꿈이 달라지는데, 최소 두 줄을 미리 잡아 두면 그 순간의
              점프가 줄어든다.
            */}
            <span
              aria-hidden="true"
              className="mt-2 grid min-h-[calc(var(--fs-hero)*2.2)] w-full"
            >
              {LINES.map((line, i) => (
                <span
                  key={line}
                  className={cn(
                    "col-start-1 row-start-1 block break-keep",
                    /*
                      ⚠️ 여기에 `transition-interactive` 를 쓰면 **크로스페이드가 깨진다.**
                         그 클래스의 transition-property 목록(styles/globals.css)에는
                         color·opacity·transform 등만 있고 **visibility 가 없다.**
                         그래서 아래에서 invisible 이 붙는 순간 visibility:hidden 이
                         0ms 에 적용되고, 나가는 문장의 150ms 페이드아웃은 **한 프레임도
                         그려지지 않는다** — 들어오는 문장만 페이드인하므로 문장 경계에서
                         h1 이 약 75ms 동안 거의 빈다.

                         visibility 를 전이 속성에 넣으면 해결된다. CSS 명세상 visibility 는
                         특수하게 보간되어, 전이 시간이 걸려 있으면 visible → hidden 전환에서
                         **전 구간 visible 을 유지하다 끝에서 뒤집힌다.** 즉 페이드아웃이
                         온전히 그려진 뒤에야 사라진다.

                         motion-safe 로 감싼 이유는 `transition-interactive` 가 원래
                         prefers-reduced-motion: no-preference 미디어 안에 정의돼 있어서다 —
                         모션을 끈 사용자에게는 전이가 없어야 아래 최종 상태가 즉시 찍힌다.
                         타이밍 함수와 150ms 는 그 클래스와 같은 값으로 맞췄다.
                    */
                    "motion-safe:transition-[opacity,visibility]",
                    /*
                      ⚠️ opacity-0 만으로는 **숨긴 것이 아니다.** 드래그 선택과 Ctrl+F 에
                         그대로 걸린다 — 이전 구현에서 h1 을 긁으면 84자 세 문장이 전부
                         딸려 나왔다(이 리포 실측). visibility:hidden(=invisible)이
                         함께 있어야 텍스트 흐름에서 빠진다.
                    */
                    i === active ? "visible opacity-100" : "invisible opacity-0",
                    /*
                      ⚠️ 모션을 끈 사용자의 **첫 페인트 점프**를 CSS 로 없앤다.
                         정적 export 라 서버 HTML 은 진행도 0 으로 직렬화된다 — 문장 ① 이다.
                         훅의 setProgress(1) 은 useEffect 라 **페인트 뒤에** 돌므로,
                         모션을 끈 사람이 정확히 「① 이 보였다가 ③ 으로 튀는」 큰 변화를
                         한 번 본다. 줄이려던 바로 그것이다.
                         판정을 setState 로 하는 한 이 점프는 원리상 없앨 수 없다(SSR 이
                         미디어 질의 결과를 모른다). 그래서 최종 상태를 JS 가 아니라
                         **미디어 질의로 CSS 가** 그리게 한다 — 첫 페인트부터 마지막 문장이다.

                         이 클래스들은 Tailwind 산출물에서 위의 무변종 유틸리티보다 **뒤에**
                         나오므로(같은 명시도, 나중 규칙 승) important 없이 이긴다.
                         훅의 setProgress(1) 은 지우지 않는다 — CSS 가 못 미치는 부분의
                         폴백이고, 모션이 켜진 경우의 경로이기도 하다.
                    */
                    i === LINES.length - 1
                      ? "motion-reduce:visible motion-reduce:opacity-100"
                      : "motion-reduce:invisible motion-reduce:opacity-0",
                  )}
                >
                  {line}
                </span>
              ))}
            </span>
          </h1>

          {/*
            dl 은 dt 가 dd 보다 **앞**이어야 유효한 HTML 인데, 화면에서는 숫자가 위에
            와야 읽힌다. flex-col-reverse 로 시각 순서만 뒤집는다 — 라벨을 sr-only 로
            한 벌 더 두면 같은 문구가 DOM 에 두 번 들어가 E2E 의 텍스트 선택자가
            strict mode 위반으로 터진다.
          */}
          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-6">
            {METRICS.map((m) => (
              <div key={m.value} className="flex flex-col-reverse">
                <dt className="mt-1 text-label uppercase tracking-[0.08em] text-n6 break-keep">
                  {m.label}
                </dt>
                <dd className="tabular text-section font-semibold text-n9">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
