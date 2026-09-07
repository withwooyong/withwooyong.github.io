---
layout: section
---

# 2부 · Elasticsearch 아키텍처

색인과 검색은 내부에서 어떻게 도는가

---

# 두 가지 사실에서 출발합니다

문서를 넣으면 약 1초 뒤부터 검색되고, 수억 건에서도 검색이 수십 밀리초에 끝납니다. 두 가지는 우연이 아니라 다음 두 구조에서 나옵니다.

<div class="grid grid-cols-2 gap-6 pt-6">
  <div class="p-4 rounded-lg border border-teal-500">
    <div class="text-teal-400 font-bold">색인 파이프라인</div>
    <div class="mt-2 text-sm">버퍼 → refresh → flush → merge</div>
  </div>
  <div class="p-4 rounded-lg border border-amber-500">
    <div class="text-amber-400 font-bold">역인덱스</div>
    <div class="mt-2 text-sm">단어에서 문서로 거꾸로 건다</div>
  </div>
</div>

---

# 클러스터 계층 구조

```mermaid {theme: 'dark', scale: 0.5}
flowchart TD
    CL["Cluster"] --> N1["Node 1"]
    CL --> N2["Node 2"]
    N1 --> IDX["Index (논리 단위)"]
    IDX --> P0["Shard P0<br/>(Lucene 인스턴스)"]
    IDX --> P1["Shard P1"]
    P0 --> S0["Segment 0"]
    P0 --> S1["Segment 1"]
    P0 --> S2["Segment 2 (불변)"]
```

<div class="pt-4">
샤드 하나가 곧 <strong>Lucene 인스턴스</strong>이고, 그 안의 세그먼트는 <strong>불변</strong>입니다. 이 불변성이 다음 장의 전부를 설명합니다.
</div>

---

# 색인 내부 동작 — 버퍼에서 디스크까지

```mermaid {theme: 'dark', scale: 0.5}
flowchart LR
    DOC["PUT 문서"] --> BUF["In-Memory Buffer<br/>(힙 약 10%)"]
    DOC --> TLOG["Translog<br/>(디스크, 유실 방지)"]
    BUF -->|refresh · 기본 1초| SEG["새 Segment<br/>(파일시스템 캐시)<br/>= 검색 가능!"]
    SEG -->|flush| DISK["디스크 영구 저장<br/>translog 비움"]
    SEG -.주기적.-> MERGE["Segment Merge<br/>작은 세그먼트 → 큰 세그먼트<br/>삭제문서 물리 제거"]
```

<div class="pt-4">
"약 1초 뒤부터 검색된다"의 정체가 <code>refresh</code>입니다 — <strong>디스크에 쓰이기 전에 이미 검색됩니다.</strong>
</div>

---

# LSM Tree — 왜 쓰기가 빠른가

```mermaid {theme: 'dark', scale: 0.55}
flowchart LR
    W["쓰기"] --> MEM["Memtable<br/>(메모리·정렬구조)"]
    W --> LOG["append-only log<br/>(= ES translog)"]
    MEM -->|flush| SST["SSTable<br/>(디스크·key 정렬 저장)"]
    SST -.compaction.-> SST2["병합된 SSTable<br/>tombstone 정리"]
    Q["조회"] --> MEM
    Q -.없으면.-> SST
```

<div class="pt-4">
앞 장의 구조가 LSM Tree 그대로입니다. <strong>제자리 수정을 하지 않고 덧붙인 뒤 나중에 병합</strong>하기 때문에 쓰기가 순차 I/O가 됩니다.
</div>

---

# 검색 동작 — Query then Fetch

```mermaid {theme: 'dark', scale: 0.5}
flowchart LR
    C["client"] --> LB["LB"] --> COORD["Coordinating Node"]
    COORD -->|1. Query: broadcast| SH["전 샤드 로컬 쿼리"]
    SH -->|2. docID + score 만 반환| COORD
    COORD -->|3. 상위 문서 선별| COORD
    COORD -->|4. Fetch: 선별 문서 내용 요청| SH2["해당 샤드"]
    SH2 -->|5. 문서 내용| COORD
    COORD -->|6. 최종 결과| C
```

<div class="pt-4 p-4 rounded-lg border-l-4 border-amber-500 bg-amber-500/10">
2단계로 나눈 이유는 <strong>1단계에서 문서 본문을 옮기지 않기 때문</strong>입니다. 그리고 이 구조가 deep pagination 이 비싼 이유이기도 합니다 — 뒤 페이지일수록 모든 샤드가 그만큼을 먼저 정렬해야 합니다.
</div>
