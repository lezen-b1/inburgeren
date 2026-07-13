import { examples } from './data';
import { examModels } from './exams';
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
  sourceType?: 'curated' | 'official-question';
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
        sourceType: 'curated',
      }];
    });
}

function stripAnswerLabel(answer: string) {
  return answer.replace(/^[A-D]\.\s*/i, '').trim();
}

function shorten(value: string, maxLength = 150) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const clipped = normalized.slice(0, maxLength);
  return `${clipped.slice(0, Math.max(0, clipped.lastIndexOf(' '))).trim()}…`;
}

function inferSkill(question: string, answer: string): Example['skill'] {
  const text = `${question} ${answer}`.toLocaleLowerCase('nl');
  if (/\b(niet|geen|nooit|zonder|behalve|alleen)\b/.test(text)) return 'negation';
  if (/\b(waarom|reden|doordat|omdat|zodat|gevolg|waardoor)\b/.test(text)) return 'cause-effect';
  if (/\b(samenvatting|conclusie|bedoeling|doel|boodschap|belangrijkste)\b/.test(text)) return 'inference-summary';
  return 'synonyms';
}

function inferLevel(question: string, evidence: string): Example['level'] {
  const text = `${question} ${evidence}`;
  if (text.length > 260 || /conclusie|samenvatting|bedoeling|boodschap|volgens de tekst/i.test(text)) return 'advanced';
  if (text.length > 140) return 'intermediate';
  return 'beginner';
}

function inferTransformationType(skill: Example['skill']) {
  if (skill === 'negation') return 'نفي أو استثناء من السؤال الرسمي';
  if (skill === 'cause-effect') return 'سبب ونتيجة من السؤال الرسمي';
  if (skill === 'inference-summary') return 'تلخيص واستنتاج من السؤال الرسمي';
  return 'مرادف أو إعادة صياغة من السؤال الرسمي';
}

function parseOfficialQuestionPairs(): ParaphrasePair[] {
  const curatedQuestionKeys = new Set(examples.map((example) => `${example.year}-${example.questionNo}`));
  const pairs: ParaphrasePair[] = [];

  for (const model of examModels) {
    for (const section of model.sections) {
      for (const question of section.questions) {
        if (curatedQuestionKeys.has(`${model.year}-${question.number}`)) continue;
        const correctOptionText = question.correctOption
          ? question.options.find((option) => option.label === question.correctOption)?.text
          : undefined;
        const answer = stripAnswerLabel(correctOptionText ?? question.answer ?? '');
        if (!answer) continue;

        const evidence = question.evidence ?? question.evidenceText;
        const left = evidence || question.question;
        const skill = inferSkill(question.question, answer);
        pairs.push({
          id: `official-${model.year}-${question.number}-${question.id}`,
          exampleId: `official-${model.year}-${question.id}`,
          left: shorten(left),
          right: shorten(answer),
          meaning: evidence
            ? `العلاقة مأخوذة من السؤال الرسمي ${question.number}: الفكرة في النص تظهر في الإجابة بصياغة أخرى.`
            : `العلاقة مأخوذة من السؤال الرسمي ${question.number}: السؤال والإجابة الصحيحة يدرّبانك على نفس المعنى بصياغتين مختلفتين.`,
          explanation: evidence
            ? `اقرأ الدليل في النص ثم قارنه بالإجابة الصحيحة. الهدف هنا تدريب العين على المعنى نفسه، لا حفظ قائمة كلمات منفصلة.`
            : `هذه بطاقة رسمية من صياغة السؤال والإجابة الصحيحة. استخدمها لفهم طريقة تحويل السؤال إلى معنى الإجابة، ثم ارجع إلى النص عند التدريب الكامل.`,
          year: model.year,
          questionNo: question.number,
          title: section.title,
          transformationType: inferTransformationType(skill),
          skill,
          level: inferLevel(question.question, left),
          sourceType: 'official-question',
        });
      }
    }
  }

  return pairs;
}

export const paraphrasePairs = [...examples.flatMap(parsePairSegments), ...parseOfficialQuestionPairs()];
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
