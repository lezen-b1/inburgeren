import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Gamepad2,
  Layers3,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  filterParaphrasePairs,
  paraphrasePairs,
  paraphraseTypes,
  paraphraseYears,
  type ParaphrasePair,
} from '../lib/paraphrasePairs';
import { usePageMeta } from '../lib/pageMeta';

const PAGE_SIZE = 12;
const QUIZ_SIZE = 10;
const STORAGE_KEY = 'nt2-paraphrase-game-v1';

type GameMode = 'cards' | 'quiz';
type PairState = 'mastered' | 'review';

interface DailyRecord {
  reviewedIds: string[];
  firstTryCorrectIds: string[];
}

interface GameStats {
  version: 1;
  goal: number;
  masteredIds: string[];
  reviewIds: string[];
  days: Record<string, DailyRecord>;
}

interface QuizQuestion {
  pair: ParaphrasePair;
  options: string[];
}

const emptyStats: GameStats = {
  version: 1,
  goal: 10,
  masteredIds: [],
  reviewIds: [],
  days: {},
};

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStats;
    const parsed = JSON.parse(raw) as Partial<GameStats>;
    return {
      version: 1,
      goal: [5, 10, 15, 20].includes(parsed.goal ?? 0) ? parsed.goal! : 10,
      masteredIds: Array.isArray(parsed.masteredIds) ? parsed.masteredIds.filter((value): value is string => typeof value === 'string') : [],
      reviewIds: Array.isArray(parsed.reviewIds) ? parsed.reviewIds.filter((value): value is string => typeof value === 'string') : [],
      days: parsed.days && typeof parsed.days === 'object' ? parsed.days as Record<string, DailyRecord> : {},
    };
  } catch {
    return emptyStats;
  }
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const next = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[next]] = [copy[next], copy[index]];
  }
  return copy;
}

function makeQuiz(pool: ParaphrasePair[]): QuizQuestion[] {
  const selected = shuffle(pool).slice(0, Math.min(QUIZ_SIZE, pool.length));
  return selected.map((pair) => {
    const distractors = shuffle(
      [...new Set(pool.filter((item) => item.id !== pair.id && item.right !== pair.right).map((item) => item.right))],
    ).slice(0, 3);
    return { pair, options: shuffle([pair.right, ...distractors]) };
  });
}

function calculateStreak(stats: GameStats) {
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const row = stats.days[todayKey(cursor)];
    if (!row?.reviewedIds?.length) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function PhraseCard({ pair, state, onRate }: {
  pair: ParaphrasePair;
  state: PairState | null;
  onRate: (pair: ParaphrasePair, state: PairState) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <article className={`phrase-card${state ? ` phrase-card--${state}` : ''}`}>
      <div className="phrase-card__meta">
        <span className="chip chip--purple">{pair.year}</span>
        <span className="chip">Vraag {pair.questionNo}</span>
        {state && <span className={`status-pill status-pill--${state === 'mastered' ? 'success' : 'warning'}`}>{state === 'mastered' ? 'متقنة' : 'مراجعة'}</span>}
      </div>
      <small>In de tekst</small>
      <p className="phrase-card__main" lang="nl" dir="ltr">{pair.left}</p>
      <div className="meaning-equals" aria-hidden="true">≈</div>
      {revealed ? (
        <>
          <small>In het antwoord</small>
          <p className="phrase-card__answer" lang="nl" dir="ltr">{pair.right}</p>
          <p className="phrase-card__meaning">{pair.meaning}</p>
          <div className="phrase-card__rating">
            <button className="button button--primary" type="button" onClick={() => onRate(pair, 'mastered')}><CheckCircle2 size={17} /> عرفتها</button>
            <button className="button button--secondary" type="button" onClick={() => onRate(pair, 'review')}><RefreshCw size={17} /> أراجعها</button>
          </div>
        </>
      ) : (
        <button className="phrase-reveal" type="button" onClick={() => setRevealed(true)}><Eye size={18} /> اكشف العبارة المقابلة</button>
      )}
      <footer>{pair.title} · {pair.transformationType}</footer>
    </article>
  );
}

export function ParaphraseGamePage() {
  usePageMeta('لعبة العبارات', 'تدريب يومي ممتع على عبارات إعادة الصياغة الموثقة في نماذج Lezen B1.');
  const [mode, setMode] = useState<GameMode>('cards');
  const [stats, setStats] = useState<GameStats>(() => readStats());
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [quizYear, setQuizYear] = useState('');
  const quizPool = useMemo(() => paraphrasePairs.filter((pair) => !quizYear || String(pair.year) === quizYear), [quizYear]);
  const [quiz, setQuiz] = useState<QuizQuestion[]>(() => makeQuiz(paraphrasePairs));
  const [quizIndex, setQuizIndex] = useState(0);
  const [wrongOptions, setWrongOptions] = useState<string[]>([]);
  const [quizStatus, setQuizStatus] = useState<'active' | 'correct' | 'done'>('active');
  const [firstTryScore, setFirstTryScore] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  const updateStats = (updater: (current: GameStats) => GameStats) => {
    setStats((current) => {
      const next = updater(current);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const ratePair = (pair: ParaphrasePair, state: PairState, firstTry = state === 'mastered') => {
    updateStats((current) => {
      const key = todayKey();
      const day = current.days[key] ?? { reviewedIds: [], firstTryCorrectIds: [] };
      const reviewedIds = [...new Set([...day.reviewedIds, pair.id])];
      const firstTryCorrectIds = firstTry
        ? [...new Set([...day.firstTryCorrectIds, pair.id])]
        : day.firstTryCorrectIds.filter((id) => id !== pair.id);
      return {
        ...current,
        masteredIds: state === 'mastered'
          ? [...new Set([...current.masteredIds, pair.id])]
          : current.masteredIds.filter((id) => id !== pair.id),
        reviewIds: state === 'review'
          ? [...new Set([...current.reviewIds, pair.id])]
          : current.reviewIds.filter((id) => id !== pair.id),
        days: { ...current.days, [key]: { reviewedIds, firstTryCorrectIds } },
      };
    });
  };

  const filtered = useMemo(() => filterParaphrasePairs(query, year, type), [query, type, year]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const today = stats.days[todayKey()] ?? { reviewedIds: [], firstTryCorrectIds: [] };
  const todayCount = today.reviewedIds.length;
  const goalPercent = Math.min(100, Math.round((todayCount / stats.goal) * 100));
  const currentQuestion = quiz[quizIndex];

  const setGoal = (goal: number) => updateStats((current) => ({ ...current, goal }));

  const startQuiz = () => {
    setQuiz(makeQuiz(quizPool));
    setQuizIndex(0);
    setWrongOptions([]);
    setQuizStatus('active');
    setFirstTryScore(0);
    setWrongAttempts(0);
    setMode('quiz');
  };

  const chooseQuizOption = (option: string) => {
    if (!currentQuestion || quizStatus !== 'active' || wrongOptions.includes(option)) return;
    if (option !== currentQuestion.pair.right) {
      setWrongOptions((current) => [...current, option]);
      setWrongAttempts((value) => value + 1);
      return;
    }
    const firstTry = wrongOptions.length === 0;
    if (firstTry) setFirstTryScore((value) => value + 1);
    ratePair(currentQuestion.pair, firstTry ? 'mastered' : 'review', firstTry);
    setQuizStatus('correct');
  };

  const nextQuizQuestion = () => {
    if (quizIndex + 1 >= quiz.length) {
      setQuizStatus('done');
      return;
    }
    setQuizIndex((value) => value + 1);
    setWrongOptions([]);
    setQuizStatus('active');
  };

  return (
    <section className="section shell phrase-game-page">
      <div className="page-heading phrase-game-heading">
        <div>
          <span className="section-kicker"><Sparkles size={15} /> معنى واحد بكلمات مختلفة</span>
          <h1>لعبة عبارات الامتحان</h1>
          <p>جُمعت <strong>{paraphrasePairs.length}</strong> علاقة لغوية موثقة من أمثلة النماذج. خصّص عشر عبارات يوميًا: اكشف المعنى، ثم اختبر نفسك دون البحث عن الكلمة نفسها.</p>
        </div>
        <Link className="text-link" to="/library">فتح الشرح الكامل لكل مثال <ArrowLeft size={16} /></Link>
      </div>

      <div className="game-dashboard">
        <article><Target /><div><span>هدف اليوم</span><strong>{todayCount} / {stats.goal}</strong></div></article>
        <article><Trophy /><div><span>أيام متتالية</span><strong>{calculateStreak(stats)}</strong></div></article>
        <article><CheckCircle2 /><div><span>عبارات متقنة</span><strong>{stats.masteredIds.length}</strong></div></article>
        <article><RefreshCw /><div><span>تحتاج مراجعة</span><strong>{stats.reviewIds.length}</strong></div></article>
      </div>

      <div className="daily-goal-panel">
        <div className="daily-goal-panel__copy"><strong>تقدم اليوم</strong><span>{goalPercent}%</span></div>
        <div className="daily-progress" aria-label={`أنجزت ${todayCount} من ${stats.goal}`}><span style={{ width: `${goalPercent}%` }} /></div>
        <label>عدد العبارات يوميًا<select value={stats.goal} onChange={(event) => setGoal(Number(event.target.value))}><option value={5}>5</option><option value={10}>10</option><option value={15}>15</option><option value={20}>20</option></select></label>
      </div>

      <div className="game-mode-tabs" role="tablist" aria-label="نوع التدريب">
        <button className={mode === 'cards' ? 'is-active' : ''} type="button" onClick={() => setMode('cards')}><Layers3 size={18} /> بطاقات التعلّم</button>
        <button className={mode === 'quiz' ? 'is-active' : ''} type="button" onClick={() => setMode('quiz')}><Gamepad2 size={18} /> تحدّي الاختيار</button>
      </div>

      {mode === 'cards' ? (
        <>
          <div className="filter-panel phrase-filters">
            <div className="search-control">
              <label htmlFor="phrase-search">ابحث في العبارات أو المعنى</label>
              <div className="search-control__input"><Search size={19} /><input id="phrase-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="مثال: hard werken، toestemming، مباشرة…" /></div>
            </div>
            <label><span>السنة</span><select value={year} onChange={(event) => { setYear(event.target.value); setPage(1); }}><option value="">كل السنوات</option>{paraphraseYears.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>نوع التحويل</span><select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><option value="">كل الأنواع</option>{paraphraseTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
          </div>
          <div className="results-line" role="status"><span><strong>{filtered.length}</strong> عبارة</span><span>الصفحة {safePage} من {totalPages}</span></div>
          <div className="phrase-card-grid">
            {pageItems.map((pair) => (
              <PhraseCard
                key={pair.id}
                pair={pair}
                state={stats.masteredIds.includes(pair.id) ? 'mastered' : stats.reviewIds.includes(pair.id) ? 'review' : null}
                onRate={ratePair}
              />
            ))}
          </div>
          {totalPages > 1 && <nav className="pagination" aria-label="صفحات العبارات"><button disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>السابق</button><span>{safePage} / {totalPages}</span><button disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>التالي</button></nav>}
        </>
      ) : (
        <section className="quiz-lab">
          <div className="quiz-lab__toolbar">
            <label>اختبرني من سنة<select value={quizYear} onChange={(event) => setQuizYear(event.target.value)}><option value="">كل السنوات</option>{paraphraseYears.map((item) => <option key={item}>{item}</option>)}</select></label>
            <button className="button button--secondary" type="button" onClick={startQuiz}><RefreshCw size={17} /> جولة جديدة</button>
          </div>

          {quizStatus === 'done' ? (
            <div className="quiz-summary">
              <Trophy size={48} />
              <h2>انتهت الجولة</h2>
              <p>إجابات صحيحة من أول محاولة: <strong>{firstTryScore} من {quiz.length}</strong></p>
              <p>المحاولات الخاطئة: <strong>{wrongAttempts}</strong></p>
              <button className="button button--primary" type="button" onClick={startQuiz}>ابدأ جولة أخرى</button>
            </div>
          ) : currentQuestion ? (
            <div className="quiz-card">
              <div className="quiz-card__top"><span>السؤال {quizIndex + 1} من {quiz.length}</span><span>{currentQuestion.pair.year} · Vraag {currentQuestion.pair.questionNo}</span></div>
              <small>ما العبارة التي تحمل المعنى نفسه؟</small>
              <h2 lang="nl" dir="ltr">{currentQuestion.pair.left}</h2>
              <div className="quiz-options">
                {currentQuestion.options.map((option) => {
                  const wrong = wrongOptions.includes(option);
                  const correct = quizStatus === 'correct' && option === currentQuestion.pair.right;
                  return <button key={option} className={`${wrong ? 'is-wrong' : ''}${correct ? ' is-correct' : ''}`} type="button" disabled={quizStatus === 'correct' || wrong} onClick={() => chooseQuizOption(option)} lang="nl" dir="ltr">{option}</button>;
                })}
              </div>
              {wrongOptions.length > 0 && quizStatus === 'active' && <div className="quiz-feedback quiz-feedback--wrong"><XCircle size={20} /><div><strong>Niet goed.</strong><span>جرّب مرة ثانية. لا تظهر الإجابة الصحيحة قبل أن تجدها بنفسك.</span></div></div>}
              {quizStatus === 'correct' && <div className="quiz-correct-panel"><div className="quiz-feedback quiz-feedback--correct"><CheckCircle2 size={20} /><div><strong>Goed.</strong><span>{currentQuestion.pair.meaning}</span></div></div><p>{currentQuestion.pair.explanation}</p><button className="button button--primary" type="button" onClick={nextQuizQuestion}>{quizIndex + 1 === quiz.length ? 'عرض النتيجة' : 'السؤال التالي'} <ArrowLeft size={17} /></button></div>}
            </div>
          ) : <div className="empty-state"><h2>لا توجد عبارات لهذه السنة</h2><button className="button button--primary" onClick={() => { setQuizYear(''); startQuiz(); }}>استخدم كل السنوات</button></div>}
        </section>
      )}
    </section>
  );
}
