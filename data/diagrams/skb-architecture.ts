import type { FlowSpec } from "@/components/flow-diagram";

/**
 * 원본(SKB_Arch.png)은 레인 없는 자유 배치이므로 레인을 쓰지 않는다.
 * 이 스펙에는 gateway -> app -> nosql -> batch -> search -> gateway 사이클이 있어
 * 모바일 위상 정렬이 (y, x) 폴백으로 떨어진다(stacked-layout.ts). 따라서
 * 데스크톱 y 좌표 순서가 곧 모바일 읽기 순서다 — 위에서 아래로 흐름 순서를 유지할 것.
 */
export const skbArchitectureSpec: FlowSpec = {
  id: "skb-architecture",
  title: "SK브로드밴드 시스템 아키텍처",
  desc: "사용자 요청이 API Gateway를 거쳐 이미지 계층과 앱 계층으로 나뉘고, NoSQL·SQL 계층과 배치·검색·AI 계층을 지나며, 앱 계층의 로그는 Kafka를 통해 ELK 로그 시스템과 통계 계층으로 비동기 전달되는 전체 구조입니다.",
  viewBox: { w: 1200, h: 780 },
  minWidth: 1000,
  nodes: [
    // 진입
    { id: "client", label: "사용자", sub: "TV / OTT", shape: "client", x: 20, y: 330, w: 130, h: 46 },
    { id: "gateway", label: "API Gateway", shape: "box", x: 190, y: 330, w: 160, h: 46, accent: true },

    // 서빙 계층
    { id: "image-layer", label: "Image Layer", sub: "NGINX Proxy · PHP Image Server", shape: "box", x: 400, y: 150, w: 200, h: 46, accent: true },
    // 엣지 라벨(Cache miss, sync)이 들어갈 자리를 확보하려고 가로 간격을 80px 둔다
    { id: "app-layer", label: "App Layer", sub: "Spring Boot · Beats", shape: "box", x: 380, y: 460, w: 190, h: 46, accent: true },

    // 데이터 계층
    { id: "nosql", label: "NoSQL Layer", sub: "Elasticsearch · MongoDB · Redis", shape: "box", x: 650, y: 460, w: 200, h: 46 },
    { id: "sql", label: "SQL Layer", sub: "Oracle · MariaDB", shape: "box", x: 930, y: 460, w: 180, h: 46 },

    // 배치 · 검색 · AI
    // nosql과 x·w를 맞춰야 NoSQL -> Batch가 정확히 수직선이 된다
    { id: "batch", label: "Batch Layer", sub: "Python · Airflow · RabbitMQ", shape: "box", x: 650, y: 150, w: 200, h: 46 },
    { id: "search", label: "Search Layer", sub: "Spring Boot · Elasticsearch · Kibana", shape: "box", x: 960, y: 150, w: 220, h: 46, accent: true },
    { id: "ai", label: "AI Layer", sub: "Deep Learning", shape: "box", x: 960, y: 280, w: 190, h: 46 },

    // 운영 · 로그 · 통계
    { id: "admin", label: "Admin Layer", sub: "Spring Boot", shape: "box", x: 940, y: 600, w: 190, h: 46 },
    { id: "elk", label: "Log System", sub: "Elasticsearch · Logstash · Kibana · Grafana", shape: "box", x: 20, y: 690, w: 330, h: 46, accent: true },
    // app-layer와 중심 x를 맞춰(475) pub 엣지를 수직선으로 만든다
    { id: "mq", label: "MQ Layer", sub: "Kafka", shape: "box", x: 385, y: 690, w: 180, h: 46 },
    { id: "stats", label: "Statistics Layer", sub: "Spring Boot · Kibana", shape: "box", x: 650, y: 690, w: 230, h: 46 },
  ],
  edges: [
    { from: "client", to: "gateway", kind: "request", bidirectional: true },
    { from: "gateway", to: "image-layer", kind: "request", label: "image serving" },
    { from: "gateway", to: "app-layer", kind: "request", label: "data serving" },

    { from: "app-layer", to: "nosql", kind: "data", label: "Cache miss", bidirectional: true },
    { from: "nosql", to: "sql", kind: "data", label: "sync", bidirectional: true },

    { from: "nosql", to: "batch", kind: "async" },
    { from: "batch", to: "search", kind: "async", label: "Collection", bidirectional: true },
    { from: "batch", to: "sql", kind: "data" },
    { from: "search", to: "ai", kind: "data", label: "Operation", bidirectional: true },
    // 검색 결과를 게이트웨이로 되돌려 서빙한다. 상단을 크게 우회한다
    { from: "search", to: "gateway", kind: "data", label: "search data serving (text, voice)", waypoints: [{ x: 1070, y: 30 }, { x: 270, y: 30 }] },

    { from: "sql", to: "admin", kind: "data", label: "Operation" },

    { from: "app-layer", to: "mq", kind: "async", label: "pub" },
    { from: "mq", to: "elk", kind: "async", label: "sub" },
    { from: "mq", to: "stats", kind: "async", label: "sub" },
  ],
  legend: [
    { kind: "request", label: "사용자 요청" },
    { kind: "data", label: "내부 데이터" },
    { kind: "async", label: "비동기 · 스트리밍" },
  ],
};
