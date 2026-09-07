---
layout: section
---

# 6부 · 반복해 돌아오는 질문 17개

값만 외우면 응용이 안 되므로 왜 그 값인지를 함께 봅니다

---
class: text-xs
---

# 핵심 수치 — 앞의 다섯

| 주제 | 값 | 왜 그 값인가 |
| --- | --- | --- |
| 한글 음절 수 | 초성 19 × 중성 21 × 종성 28 = **11,172** | 종성 28은 '종성 없음'을 포함한 수. 이 곱셈 구조 덕분에 음절 코드에서 초성을 역산할 수 있고, 그래서 초성검색이 성립한다 |
| refresh_interval | 기본 **1초**, 대량 색인 시 늘리거나 끈다 | 버퍼를 검색 가능한 세그먼트로 바꾸는 주기. 1초가 NRT의 근거이고, 대량 색인 중 잦으면 작은 세그먼트가 폭증해 머지 부담이 커진다 |
| 자동완성 응답 목표 | **100ms** 이내 | 타이핑 중 글자마다 호출되므로 왕복 지연이 그대로 체감된다 |
| 기본 유사도 | **BM25** | TF-IDF에 문서 길이 보정과 TF 포화를 더한 것. 같은 단어를 도배한 문서가 상위를 먹는 것을 막는다 |
| fuzziness AUTO | 0~2자 완전매칭 / 3~5자 거리 1 / 6자~ 거리 2 | 짧은 단어에 편집거리를 허용하면 전혀 다른 단어가 매칭된다. 길이에 비례해 관용도를 올리는 설계 |

---
class: text-xs
---

# 핵심 수치 — 뒤의 다섯

| 주제 | 값 | 왜 그 값인가 |
| --- | --- | --- |
| 마스터 후보 수 | **홀수 3 또는 5** | 짝수면 네트워크 분단 시 양쪽 다 정족수를 못 채워 정지하거나, 각자 마스터를 뽑아 데이터가 갈라진다 |
| JVM 힙 | 최소와 최대를 같게, **32GB 이하**, 총 메모리의 **50% 이하** | 32GB를 넘으면 compressed oops가 꺼져 포인터가 커진다. 나머지 절반은 OS 페이지 캐시가 세그먼트를 캐싱해야 검색이 빠르다 |
| 디스크 watermark | low **85%** / high **90%** / flood_stage **95%** | 85%에서 신규 할당을 멈추고, 90%에서 재배치하고, 95%에서 인덱스를 읽기 전용으로 잠근다 |
| 샤드 크기 | 검색 **20GB** / 로깅 **50GB** per shard | 샤드 하나가 곧 복구·재배치 단위다. 너무 크면 복구가 느리고, 너무 잘게 쪼개면 오버헤드가 커진다 |
| OS 커널 | nofile **65535**, max_map_count **262144**, swappiness **1** | 운영 모드 부트스트랩 체크 항목이다. **하나라도 미달이면 노드가 아예 뜨지 않는다** |

---
layout: center
class: text-center
---

# 메모리를 더 줬는데 성능이 나빠지는 구간이 있습니다

<div class="pt-8 grid grid-cols-3 gap-4 text-left text-sm">
  <div class="p-4 rounded-lg border border-teal-500">
    <div class="font-bold text-teal-400">최소 = 최대</div>
    <div class="mt-2">힙 리사이징으로 인한 GC 변동을 없앱니다</div>
  </div>
  <div class="p-4 rounded-lg border border-amber-500">
    <div class="font-bold text-amber-400">32GB 이하</div>
    <div class="mt-2">초과하면 compressed oops를 잃어 포인터가 커집니다</div>
  </div>
  <div class="p-4 rounded-lg border border-rose-500">
    <div class="font-bold text-rose-400">총 메모리의 50% 이하</div>
    <div class="mt-2">나머지 절반은 OS 페이지 캐시가 써야 합니다</div>
  </div>
</div>

<div class="pt-10 text-xl">
<strong>힙을 키우는 것이 곧 성능 향상이 아닙니다.</strong>
</div>

---
class: text-sm
---

# 기본 제공이 없어 직접 만들어야 하는 것

| 기능 | ES 기본 제공 | 직접 만들어야 하는 것 |
| --- | --- | --- |
| 초성검색 | 없음 | 유니코드 자소분해 + 커스텀 플러그인 |
| 한영검색(자판 오타) | 없음 | 한영 키맵 변환 필터를 색인·검색에 병행 |
| 자동완성 | 부품만 제공 | 색인과 검색 분석기 분리 + 초성·자모·영타·한타 멀티필드 설계 |
| 무결과 처리 | 정책 없음 | 단계적 폴백을 정책으로 설계 |

<div class="pt-6 p-5 rounded-lg border-l-4 border-teal-500 bg-teal-500/10 text-base">
한국어 검색에서 사용자가 <strong>당연하게 기대하는</strong> 기능 중 상당수가 기본 기능이 없습니다. 상용 검색엔진에서는 규격서 한 줄로 주어지던 것들이라, 오픈소스로 넘어올 때 <strong>가장 먼저 부딪히는 벽</strong>입니다.
</div>
