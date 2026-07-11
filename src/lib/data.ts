import rawExamples from '../data/examples.json';
import { ExamplesSchema, type Example } from './schema';

const parsed = ExamplesSchema.safeParse(rawExamples);
export const dataError = parsed.success
  ? null
  : 'تعذر التحقق من ملف بيانات الأمثلة. تأكد من أن examples.json موجود ولم يتلف.';
export const examples: Example[] = parsed.success ? parsed.data : [];

export const years = [...new Set(examples.map((example) => example.year))].sort((a, b) => a - b);
export const titles = [...new Set(examples.map((example) => example.title))].sort((a, b) =>
  a.localeCompare(b, 'nl'),
);
export const transformationTypes = [...new Set(examples.map((example) => example.transformationType))].sort(
  (a, b) => a.localeCompare(b, 'ar'),
);

export const skillLabels: Record<Example['skill'], string> = {
  synonyms: 'مرادفات وإعادة صياغة',
  negation: 'النفي والاستثناء',
  'cause-effect': 'السبب والنتيجة',
  'grammar-transform': 'تحويلات لغوية',
  'inference-summary': 'الاستنتاج والتلخيص',
};

export const levelLabels: Record<Example['level'], string> = {
  beginner: 'أساسي',
  intermediate: 'متوسط',
  advanced: 'متقدم',
};
