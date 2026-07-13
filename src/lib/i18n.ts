import { useEffect, useMemo } from 'react';

type Locale = 'nl' | 'en' | 'ar' | 'tr' | 'uk' | 'so' | 'fa' | 'ti' | 'ku';

const supportedLocales: Locale[] = ['nl', 'en', 'ar', 'tr', 'uk', 'so', 'fa', 'ti', 'ku'];

const aliases: Record<string, Locale> = {
  nl: 'nl',
  en: 'en',
  ar: 'ar',
  tr: 'tr',
  uk: 'uk',
  ukr: 'uk',
  so: 'so',
  fa: 'fa',
  prs: 'fa',
  ti: 'ti',
  ku: 'ku',
  ckb: 'ku',
  kmr: 'ku',
};

const rtlLocales = new Set<Locale>(['ar', 'fa', 'ku']);

const dictionaries: Record<Locale, Record<string, string>> = {
  nl: {
    home: 'Home',
    library: 'Bibliotheek',
    models: 'Examens',
    training: 'Training',
    phrases: 'Betekenisspel',
    progress: 'Voortgang',
    sources: 'Bronnen',
    settings: 'Instellingen',
    install: 'Installeren',
    theme: 'Thema',
    updateAvailable: 'Er is een nieuwe versie beschikbaar.',
    updateNow: 'Nu bijwerken',
    later: 'Later',
    footerTitle: 'NT2 Lezen B1 · Parafrase Lab',
    footerText: 'Oefentool voor de openbare Lezen I examens van 2023, 2024 en 2025.',
    localNote: 'Je voortgang wordt lokaal in deze browser bewaard.',
    skip: 'Ga naar inhoud',
    brandSmall: 'Officiele examens 2023-2025',
  },
  en: {
    home: 'Home',
    library: 'Library',
    models: 'Exams',
    training: 'Training',
    phrases: 'Meaning game',
    progress: 'Progress',
    sources: 'Sources',
    settings: 'Settings',
    install: 'Install',
    theme: 'Theme',
    updateAvailable: 'A newer version is available.',
    updateNow: 'Update now',
    later: 'Later',
    footerTitle: 'NT2 Lezen B1 · Paraphrase Lab',
    footerText: 'Practice tool for the public Lezen I exams from 2023, 2024 and 2025.',
    localNote: 'Your progress is stored locally in this browser.',
    skip: 'Skip to content',
    brandSmall: 'Official exams 2023-2025',
  },
  ar: {
    home: 'الرئيسية',
    library: 'المكتبة',
    models: 'النماذج',
    training: 'التدريب',
    phrases: 'لعبة المعنى',
    progress: 'التقدم',
    sources: 'المصادر',
    settings: 'الإعدادات',
    install: 'تثبيت',
    theme: 'المظهر',
    updateAvailable: 'يتوفر إصدار أحدث من الموقع.',
    updateNow: 'تحديث الآن',
    later: 'لاحقًا',
    footerTitle: 'NT2 Lezen B1 · مختبر إعادة الصياغة',
    footerText: 'أداة تدريب غير رسمية مخصصة لنماذج Lezen I للأعوام 2023 و2024 و2025.',
    localNote: 'يُحفظ تقدمك محليًا في هذا المتصفح.',
    skip: 'انتقل إلى المحتوى',
    brandSmall: 'نماذج رسمية 2023-2025',
  },
  tr: {
    home: 'Ana sayfa',
    library: 'Kutuphanе',
    models: 'Sinavlar',
    training: 'Alistirma',
    phrases: 'Anlam oyunu',
    progress: 'Ilerleme',
    sources: 'Kaynaklar',
    settings: 'Ayarlar',
    install: 'Yukle',
    theme: 'Tema',
    updateAvailable: 'Yeni bir surum var.',
    updateNow: 'Simdi guncelle',
    later: 'Sonra',
    footerTitle: 'NT2 Lezen B1 · Parafraz Lab',
    footerText: '2023, 2024 ve 2025 Lezen I acik sinavlari icin alistirma araci.',
    localNote: 'Ilerlemeniz bu tarayicida yerel olarak saklanir.',
    skip: 'Icerige gec',
    brandSmall: 'Resmi sinavlar 2023-2025',
  },
  uk: {
    home: 'Головна',
    library: 'Бібліотека',
    models: 'Іспити',
    training: 'Тренування',
    phrases: 'Гра значень',
    progress: 'Прогрес',
    sources: 'Джерела',
    settings: 'Налаштування',
    install: 'Встановити',
    theme: 'Тема',
    updateAvailable: 'Доступна нова версія.',
    updateNow: 'Оновити',
    later: 'Пізніше',
    footerTitle: 'NT2 Lezen B1 · Лабораторія перефразування',
    footerText: 'Тренажер для відкритих іспитів Lezen I 2023, 2024 і 2025.',
    localNote: 'Ваш прогрес зберігається локально в цьому браузері.',
    skip: 'Перейти до вмісту',
    brandSmall: 'Офіційні іспити 2023-2025',
  },
  so: {
    home: 'Bogga hore',
    library: 'Maktabad',
    models: 'Imtixaanno',
    training: 'Tababar',
    phrases: 'Ciyaarta macnaha',
    progress: 'Horumar',
    sources: 'Ilaha',
    settings: 'Dejinta',
    install: 'Rakib',
    theme: 'Muuqaal',
    updateAvailable: 'Nooc cusub ayaa diyaar ah.',
    updateNow: 'Cusboonaysii',
    later: 'Mar dambe',
    footerTitle: 'NT2 Lezen B1 · Shaybaarka erayo isku macne ah',
    footerText: 'Qalab tababar oo loogu talagalay imtixaannada Lezen I ee 2023, 2024 iyo 2025.',
    localNote: 'Horumarkaaga wuxuu ku kaydsan yahay browser-kan.',
    skip: 'U gudub waxa ku jira',
    brandSmall: 'Imtixaanno rasmi ah 2023-2025',
  },
  fa: {
    home: 'خانه',
    library: 'کتابخانه',
    models: 'آزمون‌ها',
    training: 'تمرین',
    phrases: 'بازی معنا',
    progress: 'پیشرفت',
    sources: 'منابع',
    settings: 'تنظیمات',
    install: 'نصب',
    theme: 'ظاهر',
    updateAvailable: 'نسخه تازه در دسترس است.',
    updateNow: 'به‌روزرسانی',
    later: 'بعدا',
    footerTitle: 'NT2 Lezen B1 · آزمایشگاه بازنویسی',
    footerText: 'ابزار تمرین برای آزمون‌های Lezen I سال‌های 2023، 2024 و 2025.',
    localNote: 'پیشرفت شما در همین مرورگر ذخیره می‌شود.',
    skip: 'رفتن به محتوا',
    brandSmall: 'آزمون‌های رسمی 2023-2025',
  },
  ti: {
    home: 'መበገሲ',
    library: 'ቤተ መጻሕፍቲ',
    models: 'ፈተናታት',
    training: 'ልምምድ',
    phrases: 'ጸወታ ትርጉም',
    progress: 'ምዕባለ',
    sources: 'ምንጭታት',
    settings: 'ቅጥዕታት',
    install: 'ግጠም',
    theme: 'ትርኢት',
    updateAvailable: 'ሓድሽ ስሪት ኣሎ.',
    updateNow: 'ሕጂ ኣሐድስ',
    later: 'ደሓር',
    footerTitle: 'NT2 Lezen B1 · Parafrase Lab',
    footerText: 'መለማመዲ መሳርሒ ን Lezen I ፈተናታት 2023, 2024, 2025.',
    localNote: 'ምዕባለኻ ኣብዚ browser ይዕቀብ.',
    skip: 'ናብ ትሕዝቶ ኪድ',
    brandSmall: 'ወግዓዊ ፈተናታት 2023-2025',
  },
  ku: {
    home: 'Mal',
    library: 'Pirtûkxane',
    models: 'Ezmûn',
    training: 'Rahênan',
    phrases: 'Lîstika wateyê',
    progress: 'Pêşveçûn',
    sources: 'Çavkanî',
    settings: 'Mîheng',
    install: 'Saz bike',
    theme: 'Dîmen',
    updateAvailable: 'Guhertoyek nû heye.',
    updateNow: 'Niha rojane bike',
    later: 'Paşê',
    footerTitle: 'NT2 Lezen B1 · Parafrase Lab',
    footerText: 'Amûra rahênanê ji bo ezmûnên Lezen I 2023, 2024 û 2025.',
    localNote: 'Pêşveçûna te li vê gerokê tê parastin.',
    skip: 'Biçe naverokê',
    brandSmall: 'Ezmûnên fermî 2023-2025',
  },
};

function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'nl';
  for (const language of navigator.languages.length ? navigator.languages : [navigator.language]) {
    const key = language.toLocaleLowerCase().split('-')[0];
    const mapped = aliases[key];
    if (mapped && supportedLocales.includes(mapped)) return mapped;
  }
  return 'nl';
}

export function useI18n() {
  const locale = useMemo(() => detectLocale(), []);
  const dictionary = dictionaries[locale] ?? dictionaries.nl;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = rtlLocales.has(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  return {
    locale,
    dir: rtlLocales.has(locale) ? 'rtl' : 'ltr',
    t(key: string) {
      return dictionary[key] ?? dictionaries.nl[key] ?? key;
    },
  };
}
