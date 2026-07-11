import { describe, expect, it } from 'vitest';
import { examples } from './data';
import { createSessionQueue, filterExamples, normalizeText, type ExampleFilters } from './search';

const baseFilters: ExampleFilters = {
  query: '',
  scope: 'all',
  year: '',
  level: '',
  skill: '',
  type: '',
  mode: '',
  status: 'all',
  sort: 'year-asc',
};

describe('normalizeText', () => {
  it('normalizes Dutch accents and Arabic hamza forms', () => {
    expect(normalizeText('geïnteresseerd')).toBe('geinteresseerd');
    expect(normalizeText('إجابة')).toBe('اجابه');
  });
});

describe('filterExamples', () => {
  it('finds the Ruud paraphrase from Dutch words', () => {
    const result = filterExamples(examples, { ...baseFilters, query: 'hard werken' }, {});
    expect(result.some((item) => item.year === 2025 && item.questionNo === 4)).toBe(true);
  });

  it('uses one status filter without conflicting states', () => {
    const id = examples[0].id;
    const result = filterExamples(examples, { ...baseFilters, status: 'review' }, { [id]: { review: true } });
    expect(result.map((item) => item.id)).toEqual([id]);
  });
});

describe('createSessionQueue', () => {
  it('returns unique entries with a deterministic seed', () => {
    const queueA = createSessionQueue(examples, 5, 42);
    const queueB = createSessionQueue(examples, 5, 42);
    expect(queueA.map((item) => item.id)).toEqual(queueB.map((item) => item.id));
    expect(new Set(queueA.map((item) => item.id)).size).toBe(5);
  });
});
