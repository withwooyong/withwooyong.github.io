import type { LucideIcon } from "lucide-react";
import { Award, Bot, Code, Database, Users, Wrench } from "lucide-react";

export type NavItem = { href: string; label: string };

export const navItems: NavItem[] = [
  { href: "#about", label: "소개" },
  { href: "#product", label: "프로덕트 리더십" },
  { href: "#experience", label: "경력" },
  { href: "#projects", label: "프로젝트" },
  { href: "#systems", label: "시스템 구성" },
  { href: "#skills", label: "기술" },
  { href: "#writing", label: "글·링크" },
  { href: "#education", label: "학력" },
  { href: "#contact", label: "연락" },
];

export type SystemDiagram = {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  alt: string;
  caption: string;
  Icon: LucideIcon;
  iconClassName: string;
};

export const systemDiagrams: SystemDiagram[] = [
  {
    id: "ai",
    title: "야나두 AI 서비스",
    description: "AI 챗봇 및 교육 플랫폼",
    imageSrc: "/images/ai.png",
    alt: "야나두 AI 서비스 구성도",
    caption: "AI 챗봇 서비스와 교육 플랫폼의 시스템 아키텍처입니다. (클릭하여 크게 보기)",
    Icon: Bot,
    iconClassName: "text-blue-600",
  },
  {
    id: "yanadoo-all",
    title: "야나두 전체 시스템",
    description: "교육&커머스 통합 플랫폼",
    imageSrc: "/images/yanadoo_all.png",
    alt: "야나두 전체 시스템 구성도",
    caption: "야나두의 전체 교육&커머스 시스템 아키텍처입니다. (클릭하여 크게 보기)",
    Icon: Database,
    iconClassName: "text-green-600",
  },
  {
    id: "btv",
    title: "SK Broadband BTV",
    description: "N-Screen 서비스 아키텍처",
    imageSrc: "/images/BTV.png",
    alt: "SK Broadband BTV 시스템 구성도",
    caption: "SK Broadband BTV N-Screen 서비스의 시스템 아키텍처입니다. (클릭하여 크게 보기)",
    Icon: Code,
    iconClassName: "text-purple-600",
  },
  {
    id: "skb-arch",
    title: "SKB 시스템 아키텍처",
    description: "SK Broadband 시스템 구조",
    imageSrc: "/images/SKB_Arch.png",
    alt: "SKB 시스템 아키텍처",
    caption: "SK Broadband의 전체 시스템 아키텍처입니다. (클릭하여 크게 보기)",
    Icon: Wrench,
    iconClassName: "text-orange-600",
  },
  {
    id: "skb-flow1",
    title: "SKB 서비스 플로우 1",
    description: "서비스 처리 플로우",
    imageSrc: "/images/SKB_flow1.png",
    alt: "SKB 서비스 플로우 1",
    caption: "SK Broadband 서비스의 주요 처리 플로우입니다. (클릭하여 크게 보기)",
    Icon: Award,
    iconClassName: "text-cyan-600",
  },
  {
    id: "skb-flow2",
    title: "SKB 서비스 플로우 2",
    description: "추가 서비스 플로우",
    imageSrc: "/images/SKB_flow2.png",
    alt: "SKB 서비스 플로우 2",
    caption: "SK Broadband의 추가 서비스 처리 플로우입니다. (클릭하여 크게 보기)",
    Icon: Users,
    iconClassName: "text-pink-600",
  },
  {
    id: "tving",
    title: "TVING",
    description: "N-Screen Service",
    imageSrc: "/images/TVING.png",
    alt: "TVING CMS 시스템 구성도",
    caption: "CJ Hellovision TVING의 N-Screen 통합 CMS 시스템입니다. (클릭하여 크게 보기)",
    Icon: Database,
    iconClassName: "text-indigo-600",
  },
  {
    id: "career",
    title: "경력 타임라인",
    description: "개발자 경력 연혁",
    imageSrc: "/images/Career.png",
    alt: "개발자 경력 타임라인",
    caption: "허우용님의 개발자 경력 타임라인입니다. (클릭하여 크게 보기)",
    Icon: Award,
    iconClassName: "text-emerald-600",
  },
  {
    id: "yanadoo-app",
    title: "야나두 앱",
    description: "모바일 애플리케이션",
    imageSrc: "/images/yanadoo_app.png",
    alt: "야나두 앱",
    caption: "야나두 모바일 애플리케이션의 시스템 구성입니다. (클릭하여 크게 보기)",
    Icon: Bot,
    iconClassName: "text-violet-600",
  },
];

export type WritingLink = { label: string; href: string; description?: string };

export const writingLinks: WritingLink[] = [
  {
    label: "경력기술서 (Notion)",
    href: "https://www.notion.so/282845b3742d8060bff8cd6f0012ef63?source=copy_link",
    description: "상세 경력 및 프로젝트 정리",
  },
  {
    label: "GitHub",
    href: "https://github.com/withwooyong",
    description: "저장소 및 활동",
  },
];

/** 학위논문 요약(포트폴리오 내 타이핑 연출용 원문) */
export const thesisSummaryNarration = `이 논문은 클라우드 서비스 환경에서 시스템 통합(SI) 서비스를 위한 확장 가능한 데이터베이스 시스템을 구축하고자, 대표적인 NoSQL 오픈소스 솔루션인 HBase, MongoDB, Cassandra의 성능을 비교 연구한 공학석사 학위논문입니다.

주요 연구 내용

목적: 대규모 데이터를 효율적으로 처리하고, 서버 확장 시 확장성과 처리 속도를 확보할 수 있는 NoSQL 솔루션을 평가하여 시스템 통합 서비스에 적합한 선택 기준을 제공함.

실험 환경: KT ucloud의 리눅스 서버 6대를 활용하여 단일 노드 및 분산 노드(3노드, 6노드) 환경을 구축함.

평가 지표: 데이터 생성(Insert) 및 검색(Select) 시의 처리 속도.

실험 결과

각 NoSQL 솔루션별로 노드 확장(3노드 → 6노드 클러스터링)에 따른 성능 향상 효과를 측정하였습니다.

• HBase: 쓰기 성능이 읽기보다 우수함. 노드 확장 시 쓰기 성능은 약 16%, 검색 성능은 약 12% 향상됨.

• MongoDB: 인덱스 추가 시 성능 향상이 뚜렷함. SA_ID 컬럼에 인덱스를 추가하여 검증한 결과, 성능이 약 20% 개선되는 효과를 확인함.

• Cassandra: 쓰기 성능이 읽기보다 우수함. 노드 확장 시 쓰기 성능은 약 26%, 검색 성능은 약 13% 향상됨.

결론

본 연구는 NoSQL 솔루션이 데이터 분산 및 확장성을 보장함을 입증하였으며, 시스템 통합 서비스 수행 시 각 솔루션의 특성에 맞는 DB 선택의 중요성을 시사합니다. 향후에는 MySQL 등 RDBMS와의 성능 비교 및 실제 서비스 환경(IPTV, N스크린) 로그 데이터를 활용한 맵리듀스(MapReduce) 프로그램 연구가 이어질 예정입니다.`;

export type SkillCategory = { title: string; body: string; icon: "code" | "database" | "bot" | "wrench" };

export const skillCategories: SkillCategory[] = [
  { title: "Backend", body: "Spring Boot, Java, Kotlin, Node.js, Python, C++", icon: "code" },
  { title: "Database", body: "AWS RDS, MongoDB, Oracle, MSSQL, PostgreSQL, Elasticsearch, Redis", icon: "database" },
  {
    title: "AI & Search",
    body: "OpenAI, Google Gemini, DeepL, LangChain, LangGraph, LaLM, ELK Stack, Kafka, AI 챗봇, 검색엔진, 추천시스템",
    icon: "bot",
  },
  { title: "DevOps & Tools", body: "AWS EC2, AWS RDS, AWS S3, CI/CD, Jira, Confluence, Jandi, Slack", icon: "wrench" },
];
