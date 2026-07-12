import { examples } from './data';
import type { Example } from './schema';

export interface ParaphrasePair {
  id: string;
  exampleId: string;
  left: string;
  right: string;
  meaning: string;
  explanation: string;
  year: number;
  questionNo: number;
  title: string;
  transformationType: string;
  skill: Example['skill'];
  level: Example['level'];
}

function parsePairSegments(example: Example): ParaphrasePair[] {
  return example.pair
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .flatMap((segment, index) => {
      const separator = segment.indexOf('↔');
      if (separator < 0) return [];
      const left = segment.slice(0, separator).trim();
      const right = segment.slice(separator + 1).trim();
      if (!left || !right) return [];
      return [{
        id: `${example.id}--${index + 1}`,
        exampleId: example.id,
        left,
        right,
        meaning: example.meaning,
        explanation: example.explanation,
        year: example.year,
        questionNo: example.questionNo,
        title: example.title,
        transformationType: example.transformationType,
        skill: example.skill,
        level: example.level,
      }];
    });
}

export const paraphrasePairs = examples.flatMap(parsePairSegments);
export const paraphraseYears = [...new Set(paraphrasePairs.map((pair) => pair.year))].sort((a, b) => a - b);
export const paraphraseTypes = [...new Set(paraphrasePairs.map((pair) => pair.transformationType))].sort((a, b) => a.localeCompare(b, 'ar'));

export function filterParaphrasePairs(query: string, year: string, type: string) {
  const normalized = query.trim().toLocaleLowerCase('nl');
  return paraphrasePairs.filter((pair) => {
    if (year && String(pair.year) !== year) return false;
    if (type && pair.transformationType !== type) return false;
    if (!normalized) return true;
    return [pair.left, pair.right, pair.meaning, pair.explanation, pair.title]
      .some((value) => value.toLocaleLowerCase('nl').includes(normalized));
  });
}
