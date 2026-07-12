import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

const exams = readJson('src/data/exams.json');
const examples = readJson('src/data/examples.json');
const documents = readJson('src/data/documents.json');

const rows = exams.map((model) => {
  const questions = model.sections.flatMap((section) => section.questions);
  const documented = questions.filter((question) => question.evidence || question.evidenceText).length;
  const missingSource = questions.filter((question) => question.evidenceStatus === 'missing-source').length;
  const answerKeyOnly = questions.length - documented - missingSource;
  return {
    year: model.year,
    sections: model.sections.length,
    questions: questions.length,
    declared: model.questionCount,
    official: model.officialQuestionCount ?? model.questionCount,
    status: model.status,
    documented,
    answerKeyOnly,
    missingSource,
    coverage: questions.length ? Math.round((documented / questions.length) * 100) : 0,
  };
});

const totals = {
  models: exams.length,
  sections: rows.reduce((sum, row) => sum + row.sections, 0),
  questions: rows.reduce((sum, row) => sum + row.questions, 0),
  examples: examples.length,
  multipleChoiceExamples: examples.filter((example) => example.mode === 'multiple-choice').length,
  documented: rows.reduce((sum, row) => sum + row.documented, 0),
  answerKeyOnly: rows.reduce((sum, row) => sum + row.answerKeyOnly, 0),
  missingSource: rows.reduce((sum, row) => sum + row.missingSource, 0),
  pdfDocuments: documents.filter((doc) => doc.sourceUrl?.endsWith('.pdf')).length,
};

const lines = [
  '# تقرير تغطية أدلة الأسئلة',
  '',
  'هذا التقرير مولد من ملفات البيانات الفعلية بواسطة `scripts/generate-content-report.mjs`.',
  '',
  '| السنة | النصوص | الأسئلة | العدد الرسمي | الحالة | documented | answer-key-only | missing-source | نسبة التغطية |',
  '|---|---:|---:|---:|---|---:|---:|---:|---:|',
  ...rows.map((row) => `| ${row.year} | ${row.sections} | ${row.questions} | ${row.official} | ${row.status} | ${row.documented} | ${row.answerKeyOnly} | ${row.missingSource} | ${row.coverage}% |`),
  '',
  `- عدد النماذج: ${totals.models}.`,
  `- عدد النصوص: ${totals.sections}.`,
  `- عدد أسئلة النماذج الرسمية: ${totals.questions}.`,
  `- عدد أمثلة مكتبة إعادة الصياغة: ${totals.examples}.`,
  `- أمثلة متعددة الخيارات في المكتبة: ${totals.multipleChoiceExamples}.`,
  `- documented: ${totals.documented}.`,
  `- answer-key-only: ${totals.answerKeyOnly}.`,
  `- missing-source: ${totals.missingSource}.`,
  `- عدد ملفات PDF في قائمة المصادر: ${totals.pdfDocuments}.`,
  '',
  'رسالة العرض للأسئلة غير الموثقة: "الإجابة مطابقة لمفتاح الإجابة الرسمي، لكن موضع الدليل التفصيلي لم يُوثق بعد داخل قاعدة البيانات."',
];

fs.writeFileSync(path.join(root, 'CONTENT_EVIDENCE_COVERAGE_AR.md'), `${lines.join('\n')}\n`, 'utf8');
fs.writeFileSync(path.join(root, 'content-stats.json'), `${JSON.stringify({ rows, totals }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ rows, totals }, null, 2));
