import type { FlowSpec } from "@/components/flow-diagram";

export const skbFlowSearchSpec: FlowSpec = {
  id: "skb-flow-search",
  title: "SK브로드밴드 로그 기반 추천·검색 서비스 흐름도",
  desc: "STB 로그가 API Gateway와 FileBeat, Logstash, Kafka를 거쳐 Elasticsearch에 적재되고, Python 분석을 지나 추천 API와 텍스트·음성 검색 서비스로 서빙되는 흐름입니다.",
  viewBox: { w: 1200, h: 620 },
  minWidth: 900,
  lanes: [
    { id: "collect", label: "데이터 수집 계층", y: 12, h: 150 },
    { id: "analyze", label: "데이터 분석 계층", y: 182, h: 150 },
    { id: "serve", label: "서비스 계층", y: 352, h: 150 },
    { id: "search", label: "검색 서비스 (텍스트 / 음성)", y: 522, h: 86 },
  ],
  nodes: [
    // 수집 계층
    { id: "log-src", label: "로그 연동", sub: "STB / 앱", shape: "client", x: 20, y: 78, w: 130, h: 46 },
    { id: "gw-collect", label: "API Gateway", shape: "box", x: 190, y: 78, w: 130, h: 46 },
    { id: "filebeat", label: "FileBeat", sub: "로그 적재", shape: "box", x: 360, y: 78, w: 130, h: 46 },
    { id: "logstash", label: "Logstash", sub: "Kafka Pub", shape: "box", x: 530, y: 78, w: 130, h: 46 },
    { id: "kafka", label: "Kafka Cluster", shape: "box", x: 700, y: 78, w: 130, h: 46 },
    { id: "kconnect", label: "Kafka Connect", sub: "Python Sub", shape: "box", x: 870, y: 78, w: 130, h: 46, accent: true },
    { id: "es-collect", label: "Elasticsearch", sub: "수집 서버", shape: "box", x: 1040, y: 78, w: 140, h: 46, accent: true },

    // 분석 계층
    { id: "analyzer", label: "Python / Sanic", sub: "STB별 로그 분석", shape: "box", x: 700, y: 248, w: 150, h: 46, accent: true },
    { id: "rdbms", label: "RDBMS", shape: "cylinder", x: 900, y: 240, w: 130, h: 62 },
    { id: "meta-ops", label: "추천 메타 운영", sub: "Spring Boot + Kibana", shape: "circle", x: 1050, y: 244, w: 140, h: 54, accent: true },

    // 서비스 계층
    { id: "rec-req", label: "추천 API 요청", shape: "client", x: 20, y: 418, w: 130, h: 46 },
    { id: "gw-serve", label: "API Gateway", shape: "box", x: 190, y: 418, w: 130, h: 46 },
    { id: "api-cache", label: "API 서버", sub: "Ehcache", shape: "box", x: 360, y: 418, w: 130, h: 46, accent: true },
    { id: "es-serve", label: "Elasticsearch", sub: "서비스 DB", shape: "box", x: 530, y: 418, w: 130, h: 46, accent: true },

    // 검색 서비스
    { id: "search-req", label: "검색 API 호출", shape: "client", x: 20, y: 552, w: 130, h: 46 },
    { id: "nugu", label: "NUGU", sub: "SKT 음성 인식", shape: "external", x: 190, y: 552, w: 130, h: 46 },
    { id: "search-api", label: "검색 API 서버", sub: "Ehcache", shape: "box", x: 360, y: 552, w: 130, h: 46, accent: true },
    { id: "es-search", label: "Elasticsearch", sub: "검색 서비스 DB", shape: "box", x: 530, y: 552, w: 140, h: 46, accent: true },
    { id: "search-ingest", label: "Python", sub: "검색 데이터 수집·저장", shape: "box", x: 710, y: 552, w: 160, h: 46, accent: true },
  ],
  edges: [
    { from: "log-src", to: "gw-collect", kind: "request", order: 1 },
    { from: "gw-collect", to: "filebeat", kind: "data", order: 2 },
    { from: "filebeat", to: "logstash", kind: "data", order: 3 },
    { from: "logstash", to: "kafka", kind: "async", label: "pub", order: 4 },
    { from: "kafka", to: "kconnect", kind: "async", label: "sub", order: 5 },
    { from: "kconnect", to: "es-collect", kind: "data", order: 6 },

    { from: "es-collect", to: "analyzer", kind: "data", waypoints: [{ x: 1110, y: 200 }, { x: 775, y: 200 }], order: 7, duration: 1.2 },
    { from: "analyzer", to: "rdbms", kind: "data", bidirectional: true, order: 8 },
    { from: "meta-ops", to: "rdbms", kind: "data" },

    { from: "analyzer", to: "es-serve", kind: "data", waypoints: [{ x: 690, y: 340 }, { x: 600, y: 340 }], order: 8 },
    { from: "es-serve", to: "api-cache", kind: "data", order: 9 },
    { from: "api-cache", to: "gw-serve", kind: "data", order: 10 },
    { from: "gw-serve", to: "rec-req", kind: "request", order: 11 },

    { from: "search-req", to: "search-api", kind: "request", waypoints: [{ x: 170, y: 530 }, { x: 425, y: 530 }] },
    { from: "search-req", to: "nugu", kind: "external" },
    { from: "nugu", to: "search-api", kind: "external" },
    { from: "search-api", to: "es-search", kind: "data", bidirectional: true },
    { from: "search-ingest", to: "es-search", kind: "data" },
    { from: "rdbms", to: "search-ingest", kind: "data", waypoints: [{ x: 965, y: 500 }, { x: 790, y: 500 }] },
  ],
  // 순서 재생: 로그 수집 -> 분석 -> 추천 응답까지 한 줄기. 검색 서비스와 추천 메타 운영은 순서에 넣지 않는다
  steps: [
    { order: 1, caption: "셋톱박스와 앱의 시청 로그가 API Gateway 로 들어옵니다." },
    { order: 2, caption: "API Gateway 가 로그를 FileBeat 에 넘겨 파일로 적재합니다." },
    { order: 3, caption: "FileBeat 가 적재한 로그가 Logstash 로 전달됩니다." },
    { order: 4, caption: "Logstash 가 로그를 Kafka 에 발행(pub)합니다." },
    { order: 5, caption: "Kafka Connect 가 Kafka 의 로그를 구독(sub)합니다." },
    { order: 6, caption: "수집 서버 Elasticsearch 에 로그가 쌓입니다." },
    { order: 7, caption: "Python 분석 서버가 수집 서버의 로그를 가져와 STB 별로 분석합니다." },
    { order: 8, caption: "분석 결과를 RDBMS 와 서비스용 Elasticsearch 에 동시에 저장합니다." },
    { order: 9, caption: "서비스용 Elasticsearch 의 추천 결과가 API 서버(Ehcache)로 전달됩니다." },
    { order: 10, caption: "API 서버가 추천 결과를 API Gateway 로 넘깁니다." },
    { order: 11, caption: "API Gateway 가 추천 API 요청자에게 결과를 응답합니다." },
  ],
  legend: [
    { kind: "request", label: "사용자 요청" },
    { kind: "data", label: "내부 데이터" },
    { kind: "async", label: "비동기 · 스트리밍" },
    { kind: "external", label: "외부 연동" },
  ],
};
