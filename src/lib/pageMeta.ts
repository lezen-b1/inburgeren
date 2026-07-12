import { useEffect } from 'react';

const APP_NAME = 'NT2 Lezen B1';

export function buildPageTitle(label: string) {
  return `${APP_NAME} — ${label}`;
}

export function usePageMeta(label: string, description = 'تدريب غير رسمي على نماذج NT2 Lezen B1.') {
  useEffect(() => {
    document.title = buildPageTitle(label);
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.append(meta);
    }
    meta.content = description;
  }, [description, label]);
}
