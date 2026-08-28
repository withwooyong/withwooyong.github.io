/**
 * `/work` 섹션들이 공유하는 포커스 링.
 *
 * 이 상수가 여기 있는 이유는 **리포 전체의 중복을 줄이기 위해서가 아니라, 이 배치에서
 * 8번째를 만들지 않기 위해서**다. 같은 문자열이 이미 6곳에 복붙돼 있다 —
 * `site-header` · `site-footer` · `command-palette` · `search-button` ·
 * `home/section-connect` · `home/section-selected-work`.
 *
 * 전역 상수로 승격하려면 그 6개 파일을 함께 건드려야 하고, 그것은 T11 의 범위가 아니다.
 * **범위 밖이라는 판단은 기록돼야 판단이고, 기록되지 않으면 방치다** — HANDOFF 에 남겼다.
 *
 * ⚠️ Tailwind 는 이 파일도 훑어 클래스를 추출한다. 문자열을 쪼개거나 템플릿으로 조립하지 마라 —
 *    리터럴이 아니면 추출기가 못 보고, 클래스는 조용히 산출물에서 빠진다.
 */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-n0";
