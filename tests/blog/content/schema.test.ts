import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readPosts } from "@/lib/blog/loader";

/**
 * 실제 발행본 전수 검사.
 *
 * frontmatter.test.ts 가 픽스처로 규칙 자체를 검사한다면, 여기서는 그 규칙이
 * content/blog 에 실제로 지켜지고 있는지를 본다. 규칙이 맞아도 적용이 안 됐으면
 * 발행본은 깨진 채로 나간다 — source 109편이 그랬다.
 */
const CONTENT = path.join(process.cwd(), "content", "blog");

/** 분량 하한. 이보다 작으면 인접 편과 병합을 검토한다(금지선 11). 상한은 검사하지 않는다 — 금지선 13. */
const MIN_BYTES = 13_300;

describe("발행본 전수 스키마", () => {
  it("전 편이 frontmatter 검증을 통과한다", () => {
    // readPosts 는 위반을 만나면 파일명과 함께 던진다. 던지지 않는 것이 통과다.
    expect(() => readPosts()).not.toThrow();
  });

  it("한 편 이상을 읽는다", () => {
    // 경로가 틀려 0편을 읽고도 「전부 통과」로 보이는 거짓 음성을 막는다.
    expect(readPosts().length).toBeGreaterThan(0);
  });

  it("디렉터리명과 category 필드가 일치한다", () => {
    for (const post of readPosts()) {
      expect(post.category, `${post.categorySlug}/${post.slug}`).toBe(post.categorySlug);
    }
  });
});

describe("발행본 분량", () => {
  it("하한 미달 편을 보고한다 (SOFT — 실패시키지 않는다)", () => {
    const small: string[] = [];

    for (const categorySlug of fs.readdirSync(CONTENT)) {
      const dir = path.join(CONTENT, categorySlug);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const fileName of fs.readdirSync(dir)) {
        if (!fileName.endsWith(".md")) continue;
        const bytes = Buffer.byteLength(fs.readFileSync(path.join(dir, fileName), "utf8"), "utf8");
        if (bytes < MIN_BYTES) small.push(`${categorySlug}/${fileName} (${bytes} B)`);
      }
    }

    // 판정하지 않고 알린다. 병합 여부는 내용을 읽어야 정해지므로 기계가 결정할 수 없다.
    if (small.length > 0) {
      console.warn(`[SOFT] 분량 하한 ${MIN_BYTES} B 미만 ${small.length}편:\n  ${small.join("\n  ")}`);
    }
    expect(true).toBe(true);
  });
});
