import { describe, expect, it } from 'vitest';
import { examples } from './data';
import { paraphrasePairs } from './paraphrasePairs';

describe('paraphrase pairs', () => {
  it('extracts every documented pair segment without empty sides', () => {
    expect(paraphrasePairs.length).toBeGreaterThanOrEqual(examples.length);
    expect(paraphrasePairs.every((pair) => pair.left.length > 0 && pair.right.length > 0)).toBe(true);
  });

  it('uses unique ids and valid source references', () => {
    const ids = paraphrasePairs.map((pair) => pair.id);
    const exampleIds = new Set(examples.map((example) => example.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(paraphrasePairs.every((pair) => {
      if (pair.sourceType === 'official-question') {
        return pair.exampleId.startsWith('official-') && pair.year >= 2023 && pair.questionNo > 0;
      }
      return exampleIds.has(pair.exampleId);
    })).toBe(true);
  });

  it('contains the documented Ruud paraphrase', () => {
    expect(paraphrasePairs.some((pair) => pair.left === 'heel goed je best doen' && pair.right === 'hard werken')).toBe(true);
  });
});
