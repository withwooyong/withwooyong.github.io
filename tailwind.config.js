/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // 무채색 9단계 — 새 화면은 이걸 쓴다
        n0: "var(--n0)",
        n1: "var(--n1)",
        n2: "var(--n2)",
        n3: "var(--n3)",
        n4: "var(--n4)",
        n5: "var(--n5)",
        n6: "var(--n6)",
        n7: "var(--n7)",
        n8: "var(--n8)",
        n9: "var(--n9)",

        // Signal Amber — 액센트는 이것 하나뿐이다
        signal: {
          DEFAULT: "var(--signal)",
          ink: "var(--signal-ink)",
          soft: "var(--signal-soft)",
        },

        // shadcn 토큰 — 위 램프의 별칭. hsl() 래핑을 벗겼다
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--primary-hover)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
          hover: "var(--secondary-hover)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          hover: "var(--destructive-hover)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      // fontSize 키에 shadcn 색 이름(card, background, foreground, primary, secondary,
      // muted, accent, popover, destructive, border, input, ring)을 쓰지 마라.
      // Tailwind 는 fontSize 와 textColor 의 text-* 를 중복 제거하지 않고 한 규칙에 합치며,
      // 어느 색이 이길지는 textColor 패스 안의 알파벳 순서로 정해진다. 즉 짝지은 색이
      // 이길지 질지가 그 색의 이름 철자에 달린다 — 가르칠 수 없는 규칙이다.
      // card 는 card-title 로 피했다. 아래 tests/design/tokens.test.ts 가 재발을 막는다.
      fontSize: {
        hero: ["var(--fs-hero)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        section: ["var(--fs-section)", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "card-title": ["var(--fs-card)", { lineHeight: "1.35" }],
        body: ["var(--fs-body)", { lineHeight: "1.75" }],
        label: ["var(--fs-label)", { lineHeight: "1.2", letterSpacing: "0.08em" }],
      },
      fontFamily: {
        sans: [
          // 설계서 §5.4 — 한글은 Pretendard, 영문·숫자는 Inter.
          // Inter 에는 한글 글리프가 없어서 한글은 자동으로 Pretendard 로 떨어진다.
          // 반대로 Pretendard 를 앞에 두면 라틴 글리프까지 갖고 있어 Inter 가 죽는다.
          "var(--font-inter, 'Inter')",
          "Pretendard Variable",
          "Pretendard",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
