import { describe, it, expect } from 'vitest';
import { learningPaths, ContentType } from './academyContent';

const VALID_CONTENT_TYPES: ContentType[] = ['article', 'step-guide', 'checklist', 'quiz'];

describe('academyContent learningPaths data integrity', () => {
  it('all learning paths have unique slugs', () => {
    const slugs = learningPaths.map((p) => p.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it('all learning paths have at least one lesson', () => {
    for (const path of learningPaths) {
      expect(path.lessons.length, `Path "${path.slug}" has no lessons`).toBeGreaterThan(0);
    }
  });

  it('all lessons have unique slugs within each path', () => {
    for (const path of learningPaths) {
      const slugs = path.lessons.map((l) => l.slug);
      const uniqueSlugs = new Set(slugs);
      expect(
        uniqueSlugs.size,
        `Path "${path.slug}" has duplicate lesson slugs`
      ).toBe(slugs.length);
    }
  });

  it('all lessons have pathSlug matching their parent path slug', () => {
    for (const path of learningPaths) {
      for (const lesson of path.lessons) {
        expect(
          lesson.pathSlug,
          `Lesson "${lesson.slug}" in path "${path.slug}" has mismatched pathSlug`
        ).toBe(path.slug);
      }
    }
  });

  it('all lesson estimatedMinutes are positive numbers', () => {
    for (const path of learningPaths) {
      for (const lesson of path.lessons) {
        expect(
          lesson.estimatedMinutes,
          `Lesson "${lesson.slug}" estimatedMinutes is not positive`
        ).toBeGreaterThan(0);
        expect(
          typeof lesson.estimatedMinutes,
          `Lesson "${lesson.slug}" estimatedMinutes is not a number`
        ).toBe('number');
      }
    }
  });

  it('all lesson contentType values are valid', () => {
    for (const path of learningPaths) {
      for (const lesson of path.lessons) {
        expect(
          VALID_CONTENT_TYPES,
          `Lesson "${lesson.slug}" has invalid contentType "${lesson.contentType}"`
        ).toContain(lesson.contentType);
      }
    }
  });

  it('all learning paths have required fields (slug, title, description, icon, color)', () => {
    for (const path of learningPaths) {
      expect(path.slug, `A learning path is missing "slug"`).toBeTruthy();
      expect(path.title, `Path "${path.slug}" is missing "title"`).toBeTruthy();
      expect(path.description, `Path "${path.slug}" is missing "description"`).toBeTruthy();
      expect(path.icon, `Path "${path.slug}" is missing "icon"`).toBeTruthy();
      expect(path.color, `Path "${path.slug}" is missing "color"`).toBeTruthy();
    }
  });
});
