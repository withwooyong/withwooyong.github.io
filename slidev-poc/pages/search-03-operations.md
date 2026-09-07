---
layout: section
---

# 3부 · 운영과 트러블슈팅

클러스터 구성부터 장애 복구까지

---

# 클러스터 토폴로지 — 노드는 역할로 나뉩니다

```mermaid {theme: 'dark', scale: 0.5}
flowchart TD
    LB["검색 요청 (LB)"] --> C["Coordinating Node<br/>(요청 분배·결과 취합)"]
    C --> D1["Data Node 1<br/>P0, R1"]
    C --> D2["Data Node 2<br/>P1, R0"]
    C --> D3["Data Node 3<br/>P2, R보관"]
    M["Master 후보 (홀수: 3·5)<br/>quorum으로 split brain 방지"] -.클러스터 상태 관리.-> D1
    M -.-> D2
    M -.-> D3
    I["Ingest Node<br/>색인 전 전처리"] --> D1
```

<div class="pt-4">
마스터 후보를 <strong>홀수</strong>로 두는 것이 split brain 을 막는 유일한 구조적 장치입니다.
</div>

---

# Hot-Warm-Cold 와 ILM

```mermaid {theme: 'dark', scale: 0.5}
flowchart LR
    HOT["Hot<br/>data_hot<br/>고성능·고가 HW<br/>쓰기+검색 최다"] --> WARM["Warm<br/>data_warm<br/>읽기전용·forcemerge"]
    WARM --> COLD["Cold<br/>data_cold<br/>저가 HW·Replica를 S3"]
    COLD --> FROZEN["Frozen<br/>Searchable Snapshot<br/>P+R 모두 S3"]
    FROZEN --> DEL["Delete<br/>보존기간 만료"]
```

<div class="pt-6">
데이터가 나이를 먹을수록 <strong>비싼 하드웨어에서 싼 하드웨어로 내려갑니다.</strong> Frozen 단계에서는 Primary 까지 오브젝트 스토리지로 내려가고, 검색은 여전히 됩니다.
</div>

---

# 상태를 결정짓는 것은 대부분 샤드입니다

| 상태 | 의미 | 흔한 원인 |
| --- | --- | --- |
| Green | Primary·Replica 모두 정상 할당 | — |
| Yellow | **Replica**가 비정상(Primary는 정상) | 샤드 할당 실패 / 설정 오류 / 디스크 부족 |
| Red | **Primary**가 비정상 | 위 세 가지 + 레플리카 없는 샤드 손실 |

<div class="pt-6 p-4 rounded-lg border-l-4 border-rose-500 bg-rose-500/10">
<strong>Red 복구 순서</strong> — ① 문제 인덱스 확인 → ② 노드 종료가 원인이면 노드 재시작 → ③ 스냅샷 복구 → ④ 재색인.
</div>

---

# 노드 유실 시 샤드는 바로 재생성되지 않습니다

```mermaid {theme: 'dark', scale: 0.6}
stateDiagram-v2
    STARTED --> UNASSIGNED: 노드 이탈
    UNASSIGNED --> STARTED: timeout 이내 복귀(기존 샤드 재사용)
    UNASSIGNED --> INITIALIZING: timeout 경과(타 노드에 재생성)
    INITIALIZING --> RELOCATING: 리밸런싱
    RELOCATING --> STARTED: 균형 재조정 완료
```

<div class="pt-6 text-xl">
핵심 설정은 <code>index.unassigned.node_left.delayed_timeout</code>(기본 1분)입니다.<br/>
<strong>재시작 정도의 짧은 이탈에 대량 복사를 일으키지 않으려는 장치입니다.</strong>
</div>

---

# 모니터링 — 무엇이 죽었는지 어떻게 아나

```mermaid {theme: 'dark', scale: 0.45}
flowchart LR
    subgraph 수집
        FB["Filebeat<br/>(로그)"]
        MB["Metricbeat<br/>(매트릭)"]
        EX["elasticsearch_exporter"]
    end
    subgraph 저장
        MON["Monitoring 전용 ES 클러스터"]
        PROM["Prometheus TSDB<br/>(pull 스크레이핑)"]
    end
    subgraph 시각화
        KB["Kibana Stack Monitoring"]
        GF["Grafana"]
    end
    FB --> MON --> KB
    MB --> MON
    EX --> PROM --> GF
```

<div class="pt-4">
모니터링을 <strong>전용 클러스터</strong>로 분리하는 이유는 하나입니다 — 감시 대상이 죽으면 감시자도 함께 죽기 때문입니다.
</div>
