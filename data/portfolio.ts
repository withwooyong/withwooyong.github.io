import type { LucideIcon } from "lucide-react";
import { Award, Bot, Code, Database, Users, Wrench } from "lucide-react";

export type NavItem = { href: string; label: string };

export const navItems: NavItem[] = [
  { href: "#about", label: "소개" },
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
