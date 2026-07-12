import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildPageTitle } from './pageMeta.ts';
import { examModels, sourceDocuments } from './exams.ts';

describe('final content integrity', () => {
  it('keeps generated documentation free from stale 2025 partial numbers', () => {
    const files = ['README_AR.md', 'CONTENT_STATUS_AR.md', 'CONTENT_EVIDENCE_COVERAGE_AR.md', 'AUDIT_FIXES_AR.md'];
    const text = files.map((file) => readFileSync(file, 'utf8')).join('\n');
    expect(text).not.toMatch(/19 من أصل 35|19 من 35|197 مسألة|197 سؤال/);
  });

  it('has every declared source PDF on disk', () => {
    for (const doc of sourceDocuments) {
      if (!doc.sourceUrl.endsWith('.pdf')) continue;
      expect(existsSync(join(process.cwd(), 'public', doc.sourceUrl.replace(/^\.\//, '')))).toBe(true);
    }
  });

  it('keeps declared question counts synchronized with data', () => {
    for (const model of examModels) {
      const count = model.sections.flatMap((section) => section.questions).length;
      expect(model.questionCount).toBe(count);
      expect(model.officialQuestionCount ?? model.questionCount).toBe(count);
    }
  });

  it('builds route metadata titles consistently', () => {
    expect(buildPageTitle('نموذج 2025')).toBe('NT2 Lezen B1 — نموذج 2025');
  });
});
