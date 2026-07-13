import { ExternalLink } from 'lucide-react';
import type { Example } from '../lib/schema';
import { publicAssetUrl } from '../lib/assetUrl';
import { useI18n } from '../lib/i18n';

export function SourceLink({ example, compact = false }: { example: Example; compact?: boolean }) {
  const { t } = useI18n();
  const page = example.source.evidencePage;
  const href = publicAssetUrl(example.source.url);
  return (
    <a
      className={compact ? 'source-link source-link--compact' : 'source-link'}
      href={href}
      target="_blank"
      rel="noreferrer"
      title={page ? t('sourceOpenTitle', { page }) : t('sourceOpen')}
    >
      <ExternalLink size={16} aria-hidden="true" />
      <span>{page ? t('sourcePage', { page }) : t('sourceOpen')}</span>
    </a>
  );
}
