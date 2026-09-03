#!/usr/bin/env node
/**
 * 원본 대조 — 발행본이 배정 원본과 축자로 겹치는 자리를 찾는다.
 *
 * `dup-scan` 은 발행본끼리만 본다. 원본은 리포 밖에 있어 그 스캔에 잡히지 않으므로,
 * 규칙 8(대조 범위는 배정 절이 아니라 원본 전체다)을 이행하려면 이 검사가 따로 필요하다.
 *
 * 두 정규화를 모두 돌린다. 2026-08-31 편1 실측에서 둘의 결과가 2건과 7건으로 갈렸다 —
 * 공백을 지우면 같은 길이의 윈도우가 더 많은 실질 내용을 담아 **덜** 걸린다.
 * 「공백을 지우면 더 엄격해진다」는 직관과 반대이므로 한쪽만 돌리면 안 된다.
 *
 *   node scripts/source-overlap.mjs <발행본> <원본> [--min 20]
 *   node scripts/source-overlap.mjs --self-test
 *
 * 자기 증명 없이 나온 수치는 설계서에 적지 않는다(규칙 9). 「0건」뿐 아니라 「N건」도
 * 증명 대상이다.
 */
import fs from "node:fs";
import { normalizeStripSpace } from "./lib/normalize.mjs";

const MIN_DEFAULT = 20;

/** 공백 보존 — 규칙 8 이 요구하는 방식. 줄바꿈만 공백 하나로 접는다. */
function normalizeKeepSpace(text) {
  return text.replace(/\s+/g, " ");
}

/**
 * 공백 제거 — `dup-scan` 의 `normalizeLine` 과 **같은 정규화**다.
 *
 * 🔴 「같아야 한다」가 아니라 「같다」인 이유는 둘이 `scripts/lib/normalize.mjs` **한
 *    함수를 가져다 쓰기** 때문이다. 2026-09-02 이전에는 각자 손으로 복사해 두었고,
 *    자기 검사 ⑫-c 조차 진짜 `dup-scan` 이 아니라 같은 파일 안의 또 다른 손복사본과
 *    비교해서, `dup-scan` 쪽 문자군을 어긋나게 해도 **21/21 을 그대로 냈다.**
 *    출력 라벨이 거짓이 되는데 검사가 아무 말도 하지 않는 상태였다.
 *
 *    ⇒ 드리프트를 검사로 잡으려 하지 말고 **드리프트가 생길 자리를 없앤다.**
 *    ⑫-c 는 이제 값 비교가 아니라 「손복사본이 되살아나지 않았는가」를 본다.
 */


/** 마크다운 표 구분선처럼 기호만 남는 줄은 내용이 아니다. */
const SYMBOLS_ONLY = /^[\s|:\-—·*#>`_+.()[\]]*$/;

/**
 * 펜스 없이 놓인 도식 본체를 알아본다 — **선언 낱말로** 판정한다.
 *
 * 🔴 「`-->` 를 담았으면 도식」으로 판정하면 화살표를 언급한 산문이 통째로 대조 대상에서
 *    빠진다. 도식이 무엇인지는 화살표가 아니라 **첫 낱말**이 말한다.
 */
const BARE_DIAGRAM = /^(?:flowchart|graph|sequenceDiagram|stateDiagram(?:-v2)?|classDiagram|erDiagram|gantt|journey|pie|mindmap|timeline)\b/;

/**
 * 표 구분선(`| --- | --- |`)을 지운다. 이것은 내용이 아니라 문법이며, 열 수가 같으면
 * 어떤 두 표든 반드시 겹친다. 지우지 않으면 거짓 양성이 실질 겹침을 덮는다.
 */
function stripTableRules(text) {
  return text.replace(/^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/gm, "");
}

/**
 * 문단 단위로 쪼갠다 — 산문이 많은 원본에서는 문단이 대조 단위다(설계서 §7-1).
 *
 * 도식 블록은 따로 담아 돌려준다. 도식의 겹침은 **문법**(`flowchart LR`, `-->`)과
 * **라벨**이 섞여 있어 본문과 같은 기준으로 세면 판정이 흐려진다. 처방 ②(구조는 유지하되
 * 라벨은 다시 쓴다)를 지켰는지는 라벨만 놓고 봐야 판정된다.
 */
function toParagraphs(markdown) {
  // 🔴 줄바꿈을 **가장 먼저** LF 로 통일한다. 이것을 하지 않으면 CRLF 파일에서
  //    프론트매터가 벗겨지지 않고 문단 분할도 일어나지 않아 **파일 전체가 한 덩어리**가
  //    된다. 42자 축자 복사가 통째로 사라졌던 자리다. 이 리포에는 CRLF 발행본이 실재한다.
  //    이후의 정규식이 전부 `\n` 만 보면 되므로 `\r?` 를 빠뜨릴 자리 자체가 없어진다.
  const unified = markdown.replace(/\r\n/g, "\n");
  const body = stripTableRules(unified.replace(/^---\n[\s\S]*?\n---\n/, ""));
  const prose = [];
  const diagrams = [];

  // 🔴 펜스 블록은 문단 분할 **전에** 통째로 걷어낸다.
  //    옛 판은 문단으로 쪼갠 뒤 「`-->` 를 담았으면 도식」으로 분류했는데, 그러면
  //    화살표를 **본문에서 언급한 산문 문단**까지 도식 버킷으로 끌려갔다. 다섯 글자가
  //    문단 하나를 통째로 대조 대상에서 지웠고, 실측으로 56자 축자 복사가 1건에서
  //    0건으로 떨어졌다. 펜스를 먼저 걷어내면 안쪽에 빈 줄이 있어도 한 덩어리로 남고,
  //    바깥에 남은 화살표는 산문으로 정상 분류된다.
  const rest = body.replace(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm, (block) => {
    diagrams.push(block.trim());
    return "\n\n";
  });

  for (const chunk of rest.split(/\n{2,}/)) {
    const trimmed = chunk.trim();
    if (!trimmed || SYMBOLS_ONLY.test(trimmed)) continue;
    // 펜스 없이 놓인 도식 본체만 남는다. 「화살표를 담았는가」가 아니라
    // 「도식 선언으로 시작하는가」로 판정한다 — 앞의 것은 산문을 삼킨다.
    if (BARE_DIAGRAM.test(trimmed)) diagrams.push(trimmed);
    else prose.push(trimmed);
  }
  prose.diagrams = diagrams;
  return prose;
}

/**
 * 라벨 대조용 정규화 — 통째 일치를 보되 **표기 차이로 회피되지 않게** 한다.
 *
 * 🔴 원문 그대로 비교하면 원본 라벨을 복사한 뒤 공백 한 칸만 끼워도 0건이 된다
 * (`제품비전` → `제품 비전`). 그러면 「③ 0건」이 처방 ② 를 지켰다는 증거가 되지 못한다.
 * ②와 같은 정규화를 태워 공백과 마크다운 기호를 지운 뒤 비교한다.
 */
function normalizeLabel(text) {
  return normalizeStripSpace(text.replace(/<br\/?>/g, " "));
}

/** 도식에서 문법 토큰을 걷어내고 라벨만 남긴다. 겹치면 안 되는 것은 라벨 쪽이다. */
function diagramLabels(chunk) {
  const labels = [...chunk.matchAll(/"([^"]+)"/g)].map((m) => m[1].replace(/<br\/?>/g, " "));
  return labels.join(" · ");
}

/**
 * ③ 줄을 만든다. 라벨 수의 **단위를 한 곳에서 정하려고** 함수로 뽑았다.
 *
 * 🔴 옛 판은 원본 쪽에 Set 크기를, 발행본 쪽에 누적 카운터를 찍으면서 양쪽을
 *    「라벨 N개」라는 같은 말로 불렀다. 실측으로 원본 도식 셋의 원시 라벨이
 *    5+6+6 = 17 인데 출력은 16 이었다 — 중복을 지운 값과 지우지 않은 값을 나란히
 *    놓고 비교하게 만든다. 검출은 Set 으로 하는 것이 맞으므로 고친 것은 판정이
 *    아니라 **라벨이다.** 그래서 이 함수는 문자열을 반환하고, 자기 검사가 계산이
 *    아니라 그 문자열을 본다 — 계산만 보는 케이스는 라벨이 다시 어긋나도 통과한다.
 */
function labelReport(source, publishedDiagrams) {
  const sourceLabelList = toParagraphs(source).diagrams.flatMap((d) =>
    [...d.matchAll(/"([^"]+)"/g)].map((m) => normalizeLabel(m[1]))
  );
  const sourceLabels = new Set(sourceLabelList);
  const hits = [];
  let publishedLabels = 0;
  for (const chunk of publishedDiagrams) {
    for (const m of chunk.matchAll(/"([^"]+)"/g)) {
      publishedLabels += 1;
      if (sourceLabels.has(normalizeLabel(m[1]))) hits.push(m[1].replace(/<br\/?>/g, " ").trim());
    }
  }
  // 발행본 라벨 수를 함께 찍는다. 이것이 없으면 「라벨이 하나도 없어서 0건」과
  // 「라벨이 있는데 겹치지 않아 0건」이 같은 줄로 나온다 — 구조적 0과 진짜 0의 구분이다.
  const line =
    `③ 도식 라벨 통째 일치 (처방 ②) — ${hits.length}건 · ` +
    `원본 라벨 ${sourceLabelList.length}개(고유 ${sourceLabels.size}개) · 발행본 라벨 ${publishedLabels}개`;
  return { hits, line };
}

/**
 * 한 문단 안에서 원본과 겹치는 구간을 최장으로 모은다.
 * 겹침을 찾으면 그 길이만큼 건너뛰므로 같은 구간이 여러 번 세어지지 않는다.
 */
function findOverlaps(paragraph, sourceNormalized, normalize, min) {
  const text = normalize(paragraph);
  const found = [];
  let i = 0;

  while (i + min <= text.length) {
    if (sourceNormalized.indexOf(text.slice(i, i + min)) === -1) {
      i += 1;
      continue;
    }
    let end = i + min;
    while (end < text.length && sourceNormalized.indexOf(text.slice(i, end + 1)) !== -1) {
      end += 1;
    }
    found.push({ text: text.slice(i, end), length: end - i });
    i = end;
  }
  return found;
}

function scan(publishedPath, sourcePath, min) {
  for (const p of [publishedPath, sourcePath]) {
    if (!fs.existsSync(p)) {
      // 파일 없음과 0건은 같아 보이면 안 된다. 조용한 0 이 이 리포에서 반복된 실패다.
      console.error(`파일이 없다: ${p}`);
      process.exit(2);
    }
  }
  const published = fs.readFileSync(publishedPath, "utf8");
  const source = fs.readFileSync(sourcePath, "utf8");
  const paragraphs = toParagraphs(published);
  const diagramLabelText = paragraphs.diagrams.map(diagramLabels).filter(Boolean);
  const sourceLabelText = toParagraphs(source).diagrams.map(diagramLabels).join(" ");

  const modes = [
    { name: "① 공백 보존 (규칙 8)", normalize: normalizeKeepSpace },
    { name: "② 공백 제거 (dup-scan 과 같은 정규화)", normalize: normalizeStripSpace },
  ];

  console.log(`원본 대조 — 문단 ${paragraphs.length}개 · 임계값 ${min}자`);
  console.log(`  발행본 ${publishedPath}`);
  console.log(`  원본   ${sourcePath}\n`);

  let worst = 0;
  for (const mode of modes) {
    const sourceNormalized = mode.normalize(source);
    const hits = [];
    for (const paragraph of paragraphs) {
      for (const hit of findOverlaps(paragraph, sourceNormalized, mode.normalize, min)) {
        hits.push({ ...hit, paragraph });
      }
    }
    hits.sort((a, b) => b.length - a.length);
    const longest = hits.length ? hits[0].length : 0;
    worst = Math.max(worst, hits.length);

    console.log(`${mode.name} — ${hits.length}건 · 최장 ${longest}자`);
    for (const hit of hits) {
      console.log(`    ${hit.length}자  ${hit.text}`);
      console.log(`      문단: ${hit.paragraph.slice(0, 70).replace(/\n/g, " ")}…`);
    }
    console.log("");
  }

  // 도식은 라벨만 따로 본다. `flowchart LR` 이 같은 것은 겹침이 아니다.
  //
  // 임계값은 여기에 쓰지 않는다. 라벨은 대개 열 자 안팎이라 20자 기준을 대면 무엇을
  // 베껴 왔든 0건이 나온다 — 검출하지 못하는 구조적 0이다. 라벨은 통째로 같은지만 본다.
  const { hits: labelHits, line: labelLine } = labelReport(source, paragraphs.diagrams);
  console.log(labelLine);
  for (const label of labelHits) console.log(`    ${label}`);
  console.log("");

  console.log("판정하지 않았다 — 용어 원어·명시적 인용은 정당할 수 있다. 사람이 열어 판정하라.");
  return worst;
}

/* ── 자기 증명 ────────────────────────────────────────────────────────────── */

function selfTest() {
  const cases = [];
  const check = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    cases.push({ name, ok, actual, expected });
  };

  const src = "네 단계는 나열된 목록이 아니라 의존 관계이며, 한 단계의 출력이 그다음 단계의 입력이 된다.";

  // ① 20자 겹침을 실제로 찾는다. 찾지 못하는 검사기의 0 은 거짓 음성이다.
  const a = findOverlaps("네 단계는 나열된 목록이 아니라 의존 관계이며, 한 단계의 출력이 여기서 갈린다.", normalizeStripSpace(src), normalizeStripSpace, 20);
  check("① 20자 이상 겹침을 검출한다", a.length > 0, true);

  // ② 겹치지 않는 문단에는 0 을 낸다.
  const b = findOverlaps("전혀 다른 이야기를 여기에 길게 적어 두었으므로 겹칠 이유가 하나도 없다.", normalizeStripSpace(src), normalizeStripSpace, 20);
  check("② 겹치지 않으면 0건이다", b.length, 0);

  // ③ 임계값 미만은 검출하지 않는다.
  const c = findOverlaps("네 단계는 나열된", normalizeStripSpace(src), normalizeStripSpace, 20);
  check("③ 임계값 미만은 세지 않는다", c.length, 0);

  // ④ 최장으로 확장한다. 20자에서 멈추면 실제 겹침 길이를 과소보고한다.
  check("④ 겹침을 최장으로 확장한다", a[0].length > 20, true);

  // ⑤ 공백 보존이 공백 제거보다 더 많이 잡는다 — 편1 실측(7건 대 2건)의 기전이다.
  //    같은 20자 윈도우라도 공백이 섞이면 실질 내용이 줄어 그만큼 더 잘 걸린다.
  //    ①만 돌렸다면 놓쳤을 겹침이 실제로 있었으므로, 이 비대칭 자체가 증명 항목이다.
  const short = "여기서부터 네 단계는 나열된 목록이 아니라 의존 여기서 끝난다";
  const keep = findOverlaps(short, normalizeKeepSpace(src), normalizeKeepSpace, 20);
  const strip = findOverlaps(short, normalizeStripSpace(src), normalizeStripSpace, 20);
  check("⑤ 공백 보존이 공백 제거보다 더 잡는다", [keep.length, strip.length], [1, 0]);

  // ⑥ frontmatter 는 대조 대상이 아니다 — 스키마 필드가 원본과 겹칠 이유가 없다.
  const paras = toParagraphs('---\ntitle: "x"\ncategory: "y"\n---\n\n본문 문단이다.\n\n두 번째 문단이다.');
  check("⑥ frontmatter 를 문단에서 제외한다", paras, ["본문 문단이다.", "두 번째 문단이다."]);

  // ⑦ 표 구분선처럼 기호만 남는 줄은 문단이 아니다.
  const paras2 = toParagraphs("| --- | --- |\n\n실제 문단이다.");
  check("⑦ 기호만 남는 줄은 문단으로 세지 않는다", [...paras2], ["실제 문단이다."]);

  // ⑧ 표 안의 구분선도 지운다. 열 수가 같은 두 표는 구분선이 반드시 일치하므로,
  //    지우지 않으면 문법이 만든 겹침이 실질 겹침을 순위에서 밀어낸다.
  const withRule = toParagraphs("| A | B |\n| --- | --- |\n| 값 | 값 |");
  check("⑧ 표 구분선을 대조 대상에서 뺀다", /-{3}/.test(withRule[0]), false);

  // ⑨ 도식은 본문과 분리해 담는다. 같은 기준으로 세면 문법이 판정을 흐린다.
  const mixed = toParagraphs('본문이다.\n\n```mermaid\nflowchart LR\n    A["라벨"] --> B["다른 라벨"]\n```');
  check("⑨ 도식을 본문 문단과 분리한다", [[...mixed].length, mixed.diagrams.length], [1, 1]);

  // ⑩ 도식에서 라벨만 뽑는다. `flowchart LR` 이 겹치는 것은 겹침이 아니다.
  check("⑩ 도식에서 라벨만 추출한다", diagramLabels('flowchart LR\n A["탐색<br/>증거"] --> B["기획"]'), "탐색 증거 · 기획");

  // ⑪ 라벨은 짧다. 20자 임계값을 대면 통째로 베낀 라벨도 0건이 되므로, 라벨 검사는
  //    임계값이 아니라 통째 일치로 판정해야 한다. 구조적 0 을 「깨끗하다」로 읽지 않기 위한 항목이다.
  const shortLabel = "④ 성장 다음 탐색 거리";
  check("⑪ 라벨은 임계값으로는 잡히지 않는다", shortLabel.length < 20, true);
  check("⑪-b 통째 일치로는 잡힌다", new Set([shortLabel]).has(shortLabel), true);

  // ⑫ 🔴 굵게를 씌운 축자 복사가 ②에 걸린다 — 이 검사기의 실제 결함이었던 자리다.
  //    옛 판(공백만 제거)은 `**` 두 쌍만 들어가도 0건을 냈다. 내용이 같은데 통과하는
  //    경로가 있으면 그 검사의 0 은 결론이 아니다.
  const bold = findOverlaps("네 단계는 **나열된 목록**이 아니라 의존 관계이며, 한 단계의 출력이 여기서 갈린다.", normalizeStripSpace(src), normalizeStripSpace, 20);
  check("⑫ 굵게를 씌운 축자 복사도 ②가 잡는다", bold.length > 0, true);

  // ⑫-b 표 셀 경계를 넘는 일치도 잡는다 — `| 셀A | 셀B |` 와 산문이 같은 문자열로 수렴한다.
  const cell = findOverlaps("| 네 단계는 나열된 목록이 아니라 | 의존 관계이며, 한 단계의 출력이 |", normalizeStripSpace(src), normalizeStripSpace, 20);
  check("⑫-b 표 셀 경계를 넘는 일치를 잡는다", cell.length > 0, true);

  // ⑫-c 🔴 두 검사기가 **같은 함수**를 쓰는지 본다 — 값을 비교하지 않는다.
  //     옛 판은 같은 파일 안에 손복사본 `dupScanLike` 를 두고 그것과 비교했다. 손복사본은
  //     정의상 언제나 일치하므로, `dup-scan` 쪽 문자군에서 물결표 하나를 빼 두 정규화를
  //     실제로 어긋나게 해도 이 항목이 **PASS 를 그대로 냈다**(뮤테이션 M1 실측).
  //     값 비교로는 드리프트를 잡을 수 없다. 잡을 수 있는 것은 **손복사본의 부재**다.
  const dupScanSrc = fs.readFileSync(new URL("./dup-scan.mjs", import.meta.url), "utf8");
  check("⑫-c dup-scan 이 공용 정규화를 가져다 쓴다", /from\s+"\.\/lib\/normalize\.mjs"/.test(dupScanSrc), true);
  check("⑫-c-2 dup-scan 에 손복사본이 되살아나지 않았다", /function\s+normalizeLine\s*\(/.test(dupScanSrc), false);

  // ⑬ 🔴 CRLF 문서에서도 문단이 쪼개진다 — 이 검사기의 실제 결함이었던 자리다.
  //    옛 판은 프론트매터 정규식과 문단 분할이 둘 다 LF 전용이라, CRLF 파일이 통째로
  //    한 덩어리가 되고 그 안의 `-->` 하나 때문에 산문 문단이 0개가 됐다. 문단이 0개면
  //    ①②는 검사할 대상 자체를 잃는다. 「0건」이 「겹치지 않는다」가 아니라
  //    **「세지 못했다」**가 되는 경로다.
  const lfDoc = "---\ntitle: x\n---\n\n첫 문단이다.\n\n둘째 문단이다. flowchart 는 없다.\n";
  const crlfDoc = lfDoc.replace(/\n/g, "\r\n");
  check("⑬ CRLF 문서도 문단으로 쪼갠다", toParagraphs(crlfDoc).length, 2);
  check("⑬-b LF 와 CRLF 가 같은 문단 수를 낸다", toParagraphs(crlfDoc).length, toParagraphs(lfDoc).length);
  check("⑬-c CRLF 문서에서도 프론트매터가 벗겨진다", toParagraphs(crlfDoc).some((p) => /title:/.test(p)), false);

  // ⑬-d 🔴 표가 든 문서에서 LF 와 CRLF 가 **같은 문단으로** 쪼개진다.
  //     2026-09-02 이전 판은 문단 **수**만 우연히 맞고 경계가 달랐다. `stripTableRules`
  //     가 CRLF 에서만 머리행과 본문행을 한 덩어리로 남겨, 같은 글이 줄바꿈에 따라 다른
  //     대조 단위를 갖고 있었다(실측: 발행본 180편 중 33편에서 경계가 갈렸다).
  //     대조 단위가 다르면 문단 경계를 걸친 겹침이 한쪽에서만 잡힌다.
  //     ⑬-b 처럼 개수만 보면 이 차이가 드러나지 않으므로 **내용으로** 대조한다.
  const tableDoc = "---\ntitle: x\n---\n\n앞 문단이다.\n\n| 용어 | 뜻 |\n| --- | --- |\n| 가 | 나 |\n| 다 | 라 |\n\n뒤 문단이다.\n";
  const flat = (ps) => [...ps].map((p) => p.replace(/\s+/g, "")).join("¶");
  check("⑬-d 표가 든 문서도 LF 와 CRLF 가 같은 문단 경계를 낸다",
    flat(toParagraphs(tableDoc.replace(/\n/g, "\r\n"))), flat(toParagraphs(tableDoc)));

  // ⑭ 🔴 라벨 대조가 공백 한 칸으로 회피되지 않는다.
  //    옛 판은 원문 그대로 비교해, 원본 라벨을 복사한 뒤 띄어쓰기만 바꾸면 0건이었다.
  //    그러면 ③의 0 은 처방 ② 를 지켰다는 증거가 되지 못한다.
  check("⑭ 라벨의 공백 차이는 회피 수단이 되지 못한다", normalizeLabel("제품비전"), normalizeLabel("제품 비전"));
  check("⑭-b 굵게를 씌운 라벨도 같은 값이 된다", normalizeLabel("**제품비전**"), normalizeLabel("제품비전"));
  check("⑭-c 내용이 다르면 다른 값이다", normalizeLabel("제품비전") !== normalizeLabel("제품목적"), true);

  // ⑮ 🔴 화살표를 언급한 **산문**은 산문으로 남는다 — 이 검사기의 실제 결함이었던 자리다.
  //    옛 판은 「`-->` 를 담았으면 도식」으로 분류해, 다섯 글자가 문단 하나를 통째로
  //    대조 대상에서 지웠다. 축자 복사가 그 문단 안에 있으면 그대로 사라진다.
  const arrowProse = toParagraphs("본문에서 `A --> B` 라고 적는 자리가 있다. 이것은 도식이 아니라 산문이다.");
  check("⑮ 화살표를 담은 산문을 도식으로 보내지 않는다", [[...arrowProse].length, arrowProse.diagrams.length], [1, 0]);

  const arrowHidden = "네 단계는 나열된 목록이 아니라 의존 관계이며, 한 단계의 출력이 여기서 갈린다. 화살표(-->)로 적어도 마찬가지다.";
  check("⑮-b 화살표가 섞여도 그 문단의 축자 복사가 잡힌다",
    findOverlaps(toParagraphs(arrowHidden).map(normalizeStripSpace).join(" "), normalizeStripSpace(src), normalizeStripSpace, 20).length > 0, true);

  // ⑮-c 펜스 안에 빈 줄이 있어도 도식은 **한 덩어리**로 남는다. 문단으로 먼저 쪼개면
  //     펜스가 조각나고, 조각 하나하나가 따로 분류돼 판정이 흐려진다.
  const gapped = toParagraphs('앞 문단이다.\n\n```mermaid\nflowchart LR\n    A["가"] --> B["나"]\n\n    B --> C["다"]\n```\n\n뒤 문단이다.');
  check("⑮-c 빈 줄이 든 펜스도 도식 하나로 센다", [[...gapped].length, gapped.diagrams.length], [2, 1]);

  // ⑯ 🔴 ③ 줄이 무엇을 세는지 고정한다 — **검사기가 출력하는 라벨도 자기 검사 항목이다.**
  //     옛 판은 원본 쪽에 고유 개수를, 발행본 쪽에 원시 개수를 찍으면서 양쪽을 「라벨 N개」로
  //     똑같이 불러, 중복을 지운 값과 지우지 않은 값을 나란히 놓고 비교하게 만들었다.
  //     계산이 아니라 **문자열**을 보는 이유는 계산만 보는 케이스는 라벨이 다시 어긋나도
  //     통과하기 때문이다. 아래 원본은 「회원」이 두 도식에 겹쳐 원시 4 · 고유 3 이 된다.
  const dupLabelSrc =
    '```mermaid\nflowchart LR\n    A["회원"] --> B["상품"]\n```\n\n```mermaid\nflowchart LR\n    C["회원"] --> D["가격"]\n```';
  const dupLabelLine = labelReport(dupLabelSrc, toParagraphs(dupLabelSrc).diagrams).line;
  check(
    "⑯ ③ 줄은 원본 라벨의 원시 개수와 고유 개수를 함께 찍는다",
    /원본 라벨 4개\(고유 3개\)/.test(dupLabelLine),
    true
  );
  check("⑯-b 발행본 라벨은 원시 개수로 센다", /발행본 라벨 4개/.test(dupLabelLine), true);

  let pass = 0;
  for (const c2 of cases) {
    console.log(`  ${c2.ok ? "PASS" : "FAIL"}  ${c2.name}`);
    if (!c2.ok) console.log(`        기대 ${JSON.stringify(c2.expected)} · 실제 ${JSON.stringify(c2.actual)}`);
    if (c2.ok) pass += 1;
  }
  console.log(`\n원본 대조 자기 검사: ${pass}/${cases.length}`);
  process.exit(pass === cases.length ? 0 : 1);
}

/* ── 진입점 ──────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
if (argv.includes("--self-test")) {
  selfTest();
} else {
  const minIndex = argv.indexOf("--min");
  const min = minIndex === -1 ? MIN_DEFAULT : Number(argv[minIndex + 1]);
  const positional = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--min");
  if (positional.length < 2) {
    console.error("사용법: node scripts/source-overlap.mjs <발행본> <원본> [--min 20]");
    process.exit(2);
  }
  scan(positional[0], positional[1], min);
}
