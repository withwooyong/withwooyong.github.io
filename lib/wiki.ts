import fs from "fs";
import path from "path";
import { buildToc, type TocEntry } from "@/lib/toc";

/**
 * 프로덕트 로드맵 위키 — 원문 마크다운 로더 (빌드 타임 전용).
 *
 * ⚠️ dropSections 는 원문의 섹션 번호다. 원문을 갱신하면 반드시 다시 대조할 것.
 *    2026-08-30 원문에서 As-Is 추정·Pain Point 검증 두 절이 빠지며 번호가 두 칸 당겨졌다.
 *
 * 원문은 pages/product-lead-loadmap/*.md 다섯 개. mermaid 도식·ERD·SQL을 그대로 살리기 위해
 * 요약하지 않고 마크다운 자체를 렌더링한다. 다만 면접 대비 목적의 섹션은 여기서 제거한다.
 *
 * getStaticProps에서만 호출할 것. 클라이언트 번들에 fs가 들어가면 안 된다.
 */

const DOCS_DIR = path.join(process.cwd(), "pages", "product-lead-loadmap");

export type WikiDoc = {
  slug: string;
  file: string;
  title: string;
  subtitle: string;
  /** 이 문서가 대응하는 공고 주요업무 */
  posting: string;
  /** 한 줄 요지 */
  essence: string;
  /** 제거할 최상위 섹션 번호 (§N) */
  dropSections: number[];
  /** 제거할 하위 섹션 (### N-M) */
  dropSubsections?: string[];
};

export const wikiDocs: WikiDoc[] = [
  {
    slug: "hub",
    file: "00_허브.md",
    title: "허브 — 4개 도메인 개관",
    subtitle: "무엇을 먼저 하고, 무엇을 뒤로 미루는가",
    posting: "주요업무 1~5번",
    essence: "네 도메인은 서로 참조한다. 그래서 순서가 곧 전략이다.",
    // §0 문서 사용법, §7 서사 카드, §8 면접 전 확인, §10 남은 작업 — 전부 면접 준비용
    dropSections: [0, 7, 8, 10],
    // 1-2. 자격요건·우대사항 대응 — 지원자 어필용
    dropSubsections: ["1-2"],
  },
  {
    slug: "cms",
    file: "01_CMS.md",
    title: "차세대 CMS 재구축",
    subtitle: "콘텐츠가 들어와 화면에 걸리기까지",
    posting: "주요업무 1 · 2번",
    essence: "CMS의 고객은 시청자가 아니라 운영자다. 그들의 화폐는 시간이다.",
    // §11 면접 질문, §12 문서의 한계
    dropSections: [11, 12],
  },
  {
    slug: "payment",
    file: "02_결제정산.md",
    title: "결제 · 정산 플랫폼",
    subtitle: "원장을 가운데 두는 설계",
    posting: "주요업무 1번",
    essence: "원장을 먼저 세우지 않으면, 바꾼 게 맞는지 검증할 기준이 없다.",
    dropSections: [11, 12],
  },
  {
    slug: "admin",
    file: "03_공통어드민.md",
    title: "공통 어드민 · 이네이블먼트",
    subtitle: "효율과 통제의 긴장을 설계로 푼다",
    posting: "주요업무 4번",
    essence: "화면 권한을 아무리 잘 걸어도, 운영 DB 직접 접속이 열려 있으면 통제는 없는 것과 같다.",
    dropSections: [11, 12],
  },
  {
    slug: "governance",
    file: "04_거버넌스_글로벌.md",
    title: "거버넌스 · 멀티테넌트 · 글로벌",
    subtitle: "확장을 반복 가능한 절차로",
    posting: "주요업무 3 · 5번",
    essence: "거버넌스는 통제가 아니라, 새 사업을 얹을 때 전체를 다시 만들지 않는 능력이다.",
    // 이 문서만 §11이 PM 조직 빌딩이라 한 칸씩 밀린다
    dropSections: [12, 13],
  },
];

/** 문서 파일명 → 위키 slug. 원문의 상호 링크를 위키 내부 링크로 바꾸는 데 쓴다. */
const FILE_TO_SLUG = new Map(wikiDocs.map((d) => [d.file, d.slug]));

/** 이 표현이 들어간 줄은 면접 대비 문장이므로 통째로 뺀다. */
const INTERVIEW_MARKERS = ["면접", "화이트보드", "Q&A"];

const H2 = /^##\s+§(\d+)\./;
const H3 = /^###\s+(\d+-\d+)\./;
const FENCE = /^\s*```/;

// 목차 생성은 블로그와 공유하므로 lib/toc.ts가 단일 구현이다.
// 기존 import 경로(`@/lib/wiki`)를 유지하기 위해 여기서 re-export한다.
export type { TocEntry } from "@/lib/toc";
export { buildToc } from "@/lib/toc";

/**
 * 원문 마크다운에서 면접용 내용을 제거하고, 위키에서 쓸 형태로 정리한다.
 * 코드 펜스 안의 `#`을 헤딩으로 오인하지 않도록 펜스 상태를 추적한다.
 */
function sanitize(raw: string, doc: WikiDoc): string {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];

  let inFence = false;
  let dropUntilNextH2 = false;
  let dropUntilNextH3 = false;
  /** H1 직후의 메타 인용문(작성 기준일·목적·연계 문서)은 통째로 건너뛴다. */
  let skippingIntro = false;

  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      if (!dropUntilNextH2 && !dropUntilNextH3) out.push(line);
      continue;
    }

    if (inFence) {
      if (!dropUntilNextH2 && !dropUntilNextH3) out.push(line);
      continue;
    }

    // H1: 위키가 자체 헤더를 그리므로 원문 제목은 뺀다. 이후 메타 인용문 스킵 시작.
    if (line.startsWith("# ")) {
      skippingIntro = true;
      continue;
    }

    if (skippingIntro) {
      // 인용문·구분선·빈 줄이 이어지는 동안은 인트로. 첫 실제 헤딩에서 종료.
      if (line.startsWith(">") || line.trim() === "" || line.trim() === "---") continue;
      skippingIntro = false;
    }

    const h2 = H2.exec(line);
    if (h2) {
      const n = Number(h2[1]);
      dropUntilNextH2 = doc.dropSections.includes(n);
      dropUntilNextH3 = false;
      if (dropUntilNextH2) continue;
    } else if (!dropUntilNextH2) {
      const h3 = H3.exec(line);
      if (h3) dropUntilNextH3 = (doc.dropSubsections ?? []).includes(h3[1]);
    }

    if (dropUntilNextH2 || dropUntilNextH3) continue;
    if (INTERVIEW_MARKERS.some((m) => line.includes(m))) continue;

    out.push(line);
  }

  return rewriteLinks(out.join("\n")).replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * 원문의 상호 링크를 위키 경로로 바꾸고, 저장소 밖 문서를 가리키는 링크는
 * 죽은 링크가 되므로 링크를 풀어 일반 텍스트로 남긴다.
 */
function rewriteLinks(md: string): string {
  return md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (whole, text: string, href: string) => {
    if (/^https?:\/\//.test(href)) return whole;

    const file = href.split("#")[0].split("/").pop() ?? "";
    const slug = FILE_TO_SLUG.get(decodeURIComponent(file));
    if (slug) return `[${text}](/product-lead-wiki/${slug}/)`;

    // ../posting_tving.md, ../../glossary/... 등 저장소에 없는 문서
    return text;
  });
}

export function getDoc(slug: string): { doc: WikiDoc; markdown: string; toc: TocEntry[] } {
  const doc = wikiDocs.find((d) => d.slug === slug);
  if (!doc) throw new Error(`알 수 없는 위키 문서: ${slug}`);

  const raw = fs.readFileSync(path.join(DOCS_DIR, doc.file), "utf8");
  const markdown = sanitize(raw, doc);

  return { doc, markdown, toc: buildToc(markdown) };
}
