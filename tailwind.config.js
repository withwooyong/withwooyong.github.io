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
      // text-card 는 shadcn 의 colors.card 와 이름이 겹친다. Tailwind 가 두 규칙을 합쳐
      // .text-card 에 font-size 와 color: var(--card) 를 함께 넣는다. fontSize 패스가
      // textColor 패스보다 먼저라 짝지어진 text-n* 가 색을 이기지만, 색 없이 단독으로 쓰면
      // 글자가 카드 배경색이 되어 보이지 않는다. text-card 는 항상 색 클래스와 함께 쓴다.
      fontSize: {
        hero: ["var(--fs-hero)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        section: ["var(--fs-section)", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        card: ["var(--fs-card)", { lineHeight: "1.35" }],
        body: ["var(--fs-body)", { lineHeight: "1.75" }],
        label: ["var(--fs-label)", { lineHeight: "1.2", letterSpacing: "0.08em" }],
      },
      fontFamily: {
        // 한글은 Pretendard, 영문·숫자는 Inter 가 먼저 잡는다
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
