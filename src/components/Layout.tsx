import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  BookOpenText,
  Files,
  Download,
  GraduationCap,
  Gamepad2,
  Home,
  ShieldCheck,
  Moon,
  RefreshCw,
  Settings,
  Sun,
} from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useI18n } from '../lib/i18n';
import { useToast } from '../lib/ToastContext';

const navItems = [
  { to: '/home', labelKey: 'home', icon: Home },
  { to: '/library', labelKey: 'library', icon: BookOpenText },
  { to: '/models', labelKey: 'models', icon: Files },
  { to: '/train', labelKey: 'training', icon: GraduationCap },
  { to: '/phrases', labelKey: 'phrases', icon: Gamepad2 },
  { to: '/progress', labelKey: 'progress', icon: BarChart3 },
  { to: '/sources', labelKey: 'sources', icon: ShieldCheck },
  { to: '/settings', labelKey: 'settings', icon: Settings },
];

type Theme = 'light' | 'dark' | 'system';

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themePreference = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14081f' : '#2e1065');
}

export function Layout({ children }: { children: ReactNode }) {
  const { locale, t } = useI18n();
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('nt2-theme') as Theme | null) ?? 'system');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { showToast } = useToast();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered() {
      // Registration succeeds silently; the UI only appears when an update exists.
    },
    onRegisterError(error) {
      console.warn('PWA registration failed', error);
    },
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('nt2-theme', theme);
    const media = matchMedia('(prefers-color-scheme: dark)');
    const listener = () => theme === 'system' && applyTheme(theme);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  useEffect(() => {
    if (locale === 'ar') return undefined;

    const hasArabic = (value: string) => /[\u0600-\u06FF]/.test(value);
    const translateArabic = (value: string) => {
      const trimmed = value.replace(/\s+/g, ' ').trim();
      if (!trimmed || !hasArabic(trimmed)) return value;
      const pageMatch = trimmed.match(/صفحة\s+(\d+)/);
      const questionMatch = trimmed.match(/السؤال\s+(\d+)\s+من\s+(\d+)/);
      if (questionMatch) return `Vraag ${questionMatch[1]} van ${questionMatch[2]}`;
      if (pageMatch) return `Pagina ${pageMatch[1]}`;
      if (/تحميل|جار/.test(trimmed)) return 'Laden...';
      if (/خطأ|تعذر|فشل|غير موجود/.test(trimmed)) return 'Er is iets misgegaan. Controleer de bron of laad opnieuw.';
      if (/إجابة|الجواب|الدليل|الشرح|مفتاح/.test(trimmed)) return 'Controleer de Nederlandse tekst en het officiele antwoord.';
      if (/اختر|تدريب|جلسة|سؤال|نموذج|مراجعة/.test(trimmed)) return 'Volg de oefening stap voor stap en zoek dezelfde betekenis in andere woorden.';
      if (/المصدر|PDF|فتح|تنزيل/.test(trimmed)) return 'Open de originele PDF of bron.';
      if (/حفظ|محفوظ|متقنة|المفضلة/.test(trimmed)) return 'Bewaar of markeer voor herhaling.';
      return 'Instructie in browsertaal.';
    };

    const localizeElement = (root: ParentNode) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      while (walker.nextNode()) {
        const node = walker.currentNode as Text;
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT'].includes(parent.tagName)) continue;
        if (hasArabic(node.data)) textNodes.push(node);
      }
      textNodes.forEach((node) => {
        node.data = translateArabic(node.data);
      });

      root.querySelectorAll?.('[title], [aria-label], [placeholder]').forEach((element) => {
        ['title', 'aria-label', 'placeholder'].forEach((name) => {
          const value = element.getAttribute(name);
          if (value && hasArabic(value)) element.setAttribute(name, translateArabic(value));
        });
      });
    };

    localizeElement(document.body);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            localizeElement(node as ParentNode);
          } else if (node.nodeType === Node.TEXT_NODE) {
            const text = node as Text;
            if (hasArabic(text.data)) text.data = translateArabic(text.data);
          }
        });
        if (mutation.type === 'characterData') {
          const text = mutation.target as Text;
          if (hasArabic(text.data)) text.data = translateArabic(text.data);
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [locale]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const themeIcon = useMemo(() => (theme === 'dark' ? Sun : Moon), [theme]);
  const ThemeIcon = themeIcon;

  const cycleTheme = () => {
    setTheme((current) => (current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system'));
  };

  const install = async () => {
    if (!installPrompt) {
      showToast(t('installNeedsHttps'), 'info');
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') showToast(t('installDone'), 'success');
    setInstallPrompt(null);
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{t('skip')}</a>
      <header className="topbar">
        <div className="shell topbar__inner">
          <NavLink to="/home" className="brand" aria-label="NT2 Lezen B1">
            <span className="brand__mark">NT2</span>
            <span className="brand__copy">
              <strong>Lezen B1</strong>
              <small>{t('brandSmall')}</small>
            </span>
          </NavLink>

          <nav className="main-nav" aria-label={t('mainNavigation')}>
            {navItems.map(({ to, labelKey, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
                <Icon size={18} aria-hidden="true" />
                <span>{t(labelKey)}</span>
              </NavLink>
            ))}
          </nav>

          <div className="topbar__actions">
            <button className="icon-button" type="button" onClick={install} title={t('install')}>
              <Download size={19} aria-hidden="true" />
              <span>{t('install')}</span>
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={cycleTheme}
              title={t('currentTheme', { theme })}
            >
              <ThemeIcon size={19} aria-hidden="true" />
              <span>{t('theme')}</span>
            </button>
          </div>
        </div>
      </header>

      {needRefresh && (
        <div className="update-banner" role="status">
          <div className="shell update-banner__inner">
            <span>{t('updateAvailable')}</span>
            <div>
              <button className="button button--light" onClick={() => void updateServiceWorker(true)}>
                <RefreshCw size={16} aria-hidden="true" /> {t('updateNow')}
              </button>
              <button className="button button--ghost-light" onClick={() => setNeedRefresh(false)}>
                {t('later')}
              </button>
            </div>
          </div>
        </div>
      )}

      <main id="main-content">{children}</main>

      <footer className="footer">
        <div className="shell footer__inner">
          <div>
            <strong>{t('footerTitle')}</strong>
            <p>{t('footerText')}</p>
            <p className="release-note">{t('release')}</p>
          </div>
          <p className="local-note">{t('localNote')}</p>
        </div>
      </footer>
    </div>
  );
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }
}
