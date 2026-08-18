// 원본 마크다운을 절(## )별로 갈라 성분 바이트를 센다.
// 분할 설계서 §2(원본 성분 실측)를 만드는 도구다. 게이트가 아니라 측정기다.
//
// 성분: 도식(```mermaid 펜스 내부) · 코드(그 외 펜스 내부) · 표(^|) · 인용(^>) ·
//       불릿(^- ^* ^N.) · 산문(나머지 비공백, 헤딩 제외)
//
// ⚠️ 왜 도식을 코드에서 뺐나 — 2026-08-18 spring-batch 설계서 §10-7
//    이전 판은 mermaid를 "개수"로만 세고 바이트는 코드 칸에 떨어뜨렸다. 원본 05의 펜스는
//    mermaid 18 · java 2였으므로 "코드%"가 사실상 전부 도식%였다. 오류 없이 그럴듯한 값이
//    나와서 그대로 §3 논증의 근거가 됐다. 라벨이 틀리면 다음 배치가 "코드가 적으니 예제를
//    더 쓰자"로 오독한다.
//
// ⚠️ 펜스 무결성 — 이 도구의 두 번째 실패 경로
//    펜스를 토글로만 세면 원본에 펜스가 홀수 개일 때 그 뒤 전체가 코드로 밀리는데,
//    오류 없이 표가 나온다. 그래서 열림/닫힘을 라벨로 짝지어 검증하고, 어긋나면
//    stderr로 경고한 뒤 종료 코드 3으로 죽는다. 조용히 틀린 표를 내지 않는다.
//
// 사용법:
//   node scripts/compose.mjs <파일>     성분표를 출력한다
//   node scripts/compose.mjs --self-test  측정 자체를 증명한다 (숫자를 믿기 전에 돌려라)
import { readFileSync } from "node:fs";

const B = (s) => Buffer.byteLength(s + "\n", "utf8");

const EMPTY = () => ({
  title: "",
  total: 0,
  prose: 0,
  table: 0,
  code: 0,
  diagram: 0,
  bullet: 0,
  quote: 0,
  mermaid: 0,
});

const KINDS = ["prose", "table", "code", "diagram", "bullet", "quote"];

/**
 * 마크다운 본문을 절별 성분 바이트로 분해한다.
 * @returns {{sections: object[], fenceErrors: string[]}}
 */
export function analyze(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  const fenceErrors = [];

  let cur = EMPTY();
  cur.title = "(머리말)";

  // 펜스 상태: null 이면 밖, 아니면 {lang, line} — 라벨을 들고 있어야 도식과 코드를 가른다
  let fence = null;

  lines.forEach((line, i) => {
    const opensOrCloses = /^\s*```/.test(line);

    // 절 경계는 펜스 "밖"에서만 인정한다. 코드 안의 '## ' 는 주석이지 헤딩이 아니다
    if (!fence && /^## /.test(line)) {
      sections.push(cur);
      cur = EMPTY();
      cur.title = line.replace(/^##\s*/, "");
    }

    const b = B(line);
    cur.total += b;

    if (opensOrCloses) {
      if (!fence) {
        const lang = (line.replace(/^\s*```/, "").trim().split(/\s+/)[0] || "").toLowerCase();
        fence = { lang, line: i + 1 };
        cur[lang === "mermaid" ? "diagram" : "code"] += b;
      } else {
        // 닫는 펜스에 라벨이 붙어 있으면 여는 펜스가 닫히지 않은 것이다
        const trailing = line.replace(/^\s*```/, "").trim();
        if (trailing !== "") {
          fenceErrors.push(
            `${i + 1}행: 닫는 펜스에 라벨 "${trailing}" — ${fence.line}행의 \`\`\`${fence.lang} 이 닫히지 않았다`
          );
        }
        cur[fence.lang === "mermaid" ? "diagram" : "code"] += b;
        fence = null;
      }
      return;
    }

    if (fence) {
      cur[fence.lang === "mermaid" ? "diagram" : "code"] += b;
      return;
    }

    if (/^\s*\|/.test(line)) cur.table += b;
    else if (/^\s*>/.test(line)) cur.quote += b;
    else if (/^\s*([-*+]\s|\d+\.\s)/.test(line)) cur.bullet += b;
    else if (line.trim() !== "" && !/^#{1,6}\s/.test(line)) cur.prose += b;
  });

  if (fence) {
    fenceErrors.push(`${fence.line}행의 \`\`\`${fence.lang} 이 끝까지 닫히지 않았다 — 그 뒤 전체가 코드로 계산됐다`);
  }

  sections.push(cur);

  // mermaid 개수는 diagram 바이트와 같은 곳에서 나와야 한다 — 여는 펜스를 다시 센다
  for (const s of sections) s.mermaid = 0;
  {
    let f = null;
    let idx = 0;
    let seen = [EMPTY()];
    // 절 경계를 다시 훑어 mermaid 개수를 절에 귀속시킨다
    const counts = sections.map(() => 0);
    lines.forEach((line) => {
      if (!f && /^## /.test(line)) idx += 1;
      if (/^\s*```/.test(line)) {
        if (!f) {
          const lang = (line.replace(/^\s*```/, "").trim().split(/\s+/)[0] || "").toLowerCase();
          f = { lang };
          if (lang === "mermaid" && counts[idx] !== undefined) counts[idx] += 1;
        } else {
          f = null;
        }
      }
    });
    counts.forEach((c, i) => {
      if (sections[i]) sections[i].mermaid = c;
    });
    void seen;
  }

  return { sections, fenceErrors };
}

const pct = (n, d) => (d === 0 ? "0.0" : ((n / d) * 100).toFixed(1));

function render(sections) {
  const out = [];
  const sum = EMPTY();

  out.push("| 절 | 합계 B | 산문% | 표% | 코드% | 도식% | 불릿% | 인용% | 도식 수 |");
  out.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const s of sections) {
    if (s.total === 0) continue;
    sum.total += s.total;
    sum.mermaid += s.mermaid;
    for (const k of KINDS) sum[k] += s[k];
    out.push(
      `| ${s.title} | ${s.total.toLocaleString()} | ${pct(s.prose, s.total)} | ${pct(s.table, s.total)} | ` +
        `${pct(s.code, s.total)} | ${pct(s.diagram, s.total)} | ${pct(s.bullet, s.total)} | ` +
        `${pct(s.quote, s.total)} | ${s.mermaid} |`
    );
  }
  out.push(
    `| **합계** | **${sum.total.toLocaleString()}** | **${pct(sum.prose, sum.total)}** | ` +
      `**${pct(sum.table, sum.total)}** | **${pct(sum.code, sum.total)}** | **${pct(sum.diagram, sum.total)}** | ` +
      `**${pct(sum.bullet, sum.total)}** | **${pct(sum.quote, sum.total)}** | **${sum.mermaid}** |`
  );

  // 절대 바이트도 낸다 — %만 있으면 다음 배치가 비율을 재환산하지 못한다
  out.push("");
  out.push(`도식 ${sum.diagram.toLocaleString()} B · 코드 ${sum.code.toLocaleString()} B · 표 ${sum.table.toLocaleString()} B`);
  return out.join("\n");
}

// ─────────────────────────────────────────────────────────────
// 자기 검사 — 이 도구가 무엇을 세는지 증명한다.
// 개수를 문서에 적지 않는다. 코드가 세고 명령이 출력한다.
// ─────────────────────────────────────────────────────────────
function selfTest() {
  const T = "```";
  const cases = [];

  // ① mermaid 바이트가 코드가 아니라 도식으로 간다 (§10-7 회귀 방지)
  cases.push({
    name: "mermaid 펜스는 도식 칸으로 간다",
    text: ["## A", T + "mermaid", "graph TD", T].join("\n"),
    check: (r) => {
      const s = r.sections.find((x) => x.title === "A");
      return s.diagram > 0 && s.code === 0 && s.mermaid === 1;
    },
  });

  // ② 언어 라벨이 있는 코드 펜스는 코드 칸으로 간다
  cases.push({
    name: "java 펜스는 코드 칸으로 간다",
    text: ["## A", T + "java", "int x = 1;", T].join("\n"),
    check: (r) => {
      const s = r.sections.find((x) => x.title === "A");
      return s.code > 0 && s.diagram === 0 && s.mermaid === 0;
    },
  });

  // ③ 둘이 섞이면 각각의 칸으로 갈린다 — 합쳐서 세지 않는다
  cases.push({
    name: "도식과 코드가 한 절에 섞여도 갈린다",
    text: ["## A", T + "mermaid", "graph TD", T, T + "java", "int x = 1;", T].join("\n"),
    check: (r) => {
      const s = r.sections.find((x) => x.title === "A");
      return s.diagram > 0 && s.code > 0 && s.mermaid === 1;
    },
  });

  // ④ 펜스 안의 '## ' 는 절 경계가 아니다
  cases.push({
    name: "펜스 안의 '## ' 로 절이 갈리지 않는다",
    text: ["## A", T + "bash", "## 이건 주석이다", T, "본문"].join("\n"),
    check: (r) => r.sections.filter((s) => s.total > 0).length === 1,
  });

  // ⑤ 닫히지 않은 펜스를 조용히 넘기지 않는다 — 이 도구의 두 번째 실패 경로
  cases.push({
    name: "닫히지 않은 펜스를 오류로 보고한다",
    text: ["## A", T + "java", "int x = 1;", "본문처럼 보이는 줄"].join("\n"),
    check: (r) => r.fenceErrors.length === 1,
  });

  // ⑥ 정상 문서에서는 오류가 없다 — ⑤가 항상 참이면 검사가 아니다
  cases.push({
    name: "정상 문서에서는 펜스 오류가 없다",
    text: ["## A", T + "java", "int x = 1;", T, "본문"].join("\n"),
    check: (r) => r.fenceErrors.length === 0,
  });

  // ⑦ 표·불릿·인용·산문이 각자의 칸으로 간다
  cases.push({
    name: "표·불릿·인용·산문이 갈린다",
    text: ["## A", "| a | b |", "- 항목", "> 인용", "산문이다"].join("\n"),
    check: (r) => {
      const s = r.sections.find((x) => x.title === "A");
      return s.table > 0 && s.bullet > 0 && s.quote > 0 && s.prose > 0;
    },
  });

  // ⑧ 헤딩은 산문이 아니다 — 산문%가 부풀지 않아야 한다
  cases.push({
    name: "헤딩은 산문에 들어가지 않는다",
    text: ["## A", "### 소제목", "산문이다"].join("\n"),
    check: (r) => {
      const s = r.sections.find((x) => x.title === "A");
      return s.prose === B("산문이다");
    },
  });

  // ⑨ 성분 합이 total 을 넘지 않는다 (이중 계상 방지)
  cases.push({
    name: "성분 합이 합계를 넘지 않는다",
    text: ["## A", T + "mermaid", "graph TD", T, "| a |", "- b", "> c", "산문"].join("\n"),
    check: (r) => {
      const s = r.sections.find((x) => x.title === "A");
      return KINDS.reduce((a, k) => a + s[k], 0) <= s.total;
    },
  });

  let pass = 0;
  const fails = [];
  for (const c of cases) {
    let ok = false;
    try {
      ok = c.check(analyze(c.text));
    } catch (e) {
      ok = false;
      c.name += ` (예외: ${e.message})`;
    }
    if (ok) pass += 1;
    else fails.push(c.name);
  }

  console.log(`compose 자기 검사: ${pass}/${cases.length}`);
  for (const f of fails) console.log(`  ✗ ${f}`);
  return fails.length === 0 ? 0 : 1;
}

// ─────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (arg === "--self-test") {
  process.exit(selfTest());
}

if (!arg) {
  console.error("사용법: node scripts/compose.mjs <파일> | --self-test");
  process.exit(1);
}

const { sections, fenceErrors } = analyze(readFileSync(arg, "utf8"));

if (fenceErrors.length > 0) {
  console.error("🔴 펜스 무결성 실패 — 아래 표는 믿을 수 없다:");
  for (const e of fenceErrors) console.error(`  ${e}`);
  process.exit(3);
}

console.log(render(sections));
