import { ExternalLink } from 'lucide-react';
import type { Example } from '../lib/schema';

export function SourceLink({ example, compact = false }: { example: Example; compact?: boolean }) {
  const page = example.source.evidencePage;
  const href = page ? `${example.source.url}#page=${page}` : example.source.url;
  return (
    <a
      className={compact ? 'source-link source-link--compact' : 'source-link'}
      href={href}
      target="_blank"
      rel="noreferrer"
      title={page ? `فتح صفحة الدليل ${page}` : 'فتح ملف المصدر'}
    >
      <ExternalLink size={16} aria-hidden="true" />
      <span>{page ? `المصدر · الصفحة ${page}` : 'فتح المصدر'}</span>
    </a>
  );
}
