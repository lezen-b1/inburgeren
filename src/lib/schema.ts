import { z } from 'zod';

export const OptionSchema = z.object({
  label: z.enum(['A', 'B', 'C', 'D']),
  text: z.string().min(1),
});

export const ExampleSchema = z.object({
  id: z.string().min(1),
  year: z.number().int().min(2020).max(2030),
  questionNo: z.number().int().positive(),
  title: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
  correctOption: z.enum(['A', 'B', 'C', 'D']).nullable(),
  options: z.array(OptionSchema),
  mode: z.enum(['multiple-choice', 'self-check']),
  evidence: z.string().min(1),
  pair: z.string().min(1),
  meaning: z.string().min(1),
  transformationType: z.string().min(1),
  skill: z.enum(['synonyms', 'negation', 'cause-effect', 'grammar-transform', 'inference-summary']),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  explanation: z.string().min(1),
  source: z.object({
    label: z.string().min(1),
    url: z.string().min(1),
    evidencePage: z.number().int().positive().nullable(),
    questionPage: z.number().int().positive().nullable(),
  }),
});

export const ExamplesSchema = z.array(ExampleSchema).min(1);
export type Example = z.infer<typeof ExampleSchema>;
export type Option = z.infer<typeof OptionSchema>;
export type Skill = Example['skill'];
export type Level = Example['level'];
