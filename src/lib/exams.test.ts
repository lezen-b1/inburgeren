import { describe, expect, it } from 'vitest';
import { ExamModelsSchema } from './schema';
import { examModels, findSectionForExample, normalizeTitle, sourceDocuments } from './exams';

describe('exam model data', () => {
  it('contains the official years 2020 through 2025', () => {
    expect(examModels.map((model) => model.year)).toEqual([2020, 2021, 2022, 2023, 2024, 2025]);
  });

  it('contains every official question for 2020 through 2024', () => {
    const complete = examModels.filter((model) => model.status === 'complete' && model.year <= 2024);
    expect(complete.reduce((sum, model) => sum + model.questionCount, 0)).toBe(178);
  });

  it('keeps every complete-model answer inside its displayed options', () => {
    for (const model of examModels.filter((item) => item.status === 'complete')) {
      for (const section of model.sections) {
        expect(section.text.length).toBeGreaterThan(100);
        for (const question of section.questions) {
          expect(question.options.map((option) => option.label)).toContain(question.correctOption);
        }
      }
    }
  });

  it('links known shortened training titles to the correct full source sections', () => {
    expect(findSectionForExample(2020, 'Gebruik van schoolcomputers', '2020-s2')?.title).toBe('Gebruik van schoolcomputers : huis- en gedragsregels');
    expect(findSectionForExample(2022, 'Zelf je rooster maken', '2022-s4')?.title).toBe('Zelf je rooster maken: een goed idee of niet?');
  });

  it('does not choose a section when normalized matching is ambiguous', () => {
    const normalized = normalizeTitle('Zelf je rooster maken: een goed idee of niet?');
    expect(normalized).toBe(normalizeTitle('Zelf je rooster maken'));
    expect(findSectionForExample(2099, 'Zelf je rooster maken')).toBeNull();
  });

  it('has unique question ids and numbers inside every model', () => {
    const ids = new Set<string>();
    for (const model of examModels) {
      const numbers = new Set<number>();
      for (const section of model.sections) {
        for (const question of section.questions) {
          expect(ids.has(question.id)).toBe(false);
          ids.add(question.id);
          expect(numbers.has(question.number)).toBe(false);
          numbers.add(question.number);
          if (question.correctOption && !question.selfCheck) {
            expect(question.options.map((option) => option.label)).toContain(question.correctOption);
          }
        }
      }
    }
  });

  it('marks 2025 as partial with 19 structured questions out of 35 official questions', () => {
    const model2025 = examModels.find((model) => model.year === 2025);
    expect(model2025?.status).toBe('partial');
    expect(model2025?.questionCount).toBe(19);
    expect(model2025?.officialQuestionCount).toBe(35);
    expect(model2025?.sections.flatMap((section) => section.questions)).toHaveLength(19);
  });

  it('never exposes an empty evidence box state', () => {
    for (const model of examModels) {
      for (const section of model.sections) {
        for (const question of section.questions) {
          expect(question.evidenceStatus === 'documented' || question.evidenceStatus === 'answer-key-only').toBe(true);
          if (question.evidenceStatus === 'documented') expect(question.evidence?.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('keeps PDF source links relative and present in the document list', () => {
    const urls = new Set(sourceDocuments.map((document) => document.sourceUrl));
    for (const model of examModels) {
      expect(model.sourceUrl.startsWith('./sources/')).toBe(true);
      expect(model.answerSourceUrl.startsWith('./sources/')).toBe(true);
      expect(urls.has(model.sourceUrl)).toBe(true);
    }
  });

  it('rejects a broken exam model with Zod', () => {
    const result = ExamModelsSchema.safeParse([{ id: 'broken', sections: [] }]);
    expect(result.success).toBe(false);
  });
});
