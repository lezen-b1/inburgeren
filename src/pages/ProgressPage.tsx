import { BarChart3, BookMarked, CircleCheckBig, RotateCcw, Star, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { examples, years } from '../lib/data';
import { useProgress } from '../lib/ProgressContext';

export function ProgressPage() {
  const { progress, sessions, ready } = useProgress();
  const rows = Object.values(progress);
  const answered = rows.filter((row) => row.attempts > 0).length;
  const mastered = rows.filter((row) => row.mastered).length;
  const review = rows.filter((row) => row.review).length;
  const favorites = rows.filter((row) => row.favorite).length;
  const totalAttempts = rows.reduce((sum, row) => sum + row.attempts, 0);
  const wrongAttempts = rows.reduce((sum, row) => sum + row.wrongAttempts, 0);
  const firstTryCorrect = rows.reduce((sum, row) => sum + row.firstTryCorrect, 0);
  const accuracy = totalAttempts ? Math.round(((totalAttempts - wrongAttempts) / totalAttempts) * 100) : 0;

  const mistakeTypes = sessions
    .flatMap((session) => session.mistakeTypes)
    .reduce<Record<string, number>>((acc, type) => ({ ...acc, [type]: (acc[type] ?? 0) + 1 }), {});
  const topMistakes = Object.entries(mistakeTypes).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const unknownWords = rows.flatMap((row) => {
    const example = examples.find((item) => item.id === row.exampleId);
    return row.unknownWords.map((word) => ({ word, example }));
  });

  if (!ready) return <section className="section shell"><div className="loading-card">جارٍ تحميل التقدم…</div></section>;

  return (
    <section className="section shell progress-page">
      <div className="page-heading">
        <div><span className="section-kicker">تحليل محلي</span><h1>تقدمك وأخطاؤك</h1><p>هذه الأرقام محفوظة في هذا المتصفح فقط. استخدم النسخة الاحتياطية عند تغيير الجهاز.</p></div>
        <Link className="button button--primary" to="/train">ابدأ جلسة جديدة</Link>
      </div>

      <div className="metric-grid">
        <Metric icon={<Target />} label="أُجيب عنها" value={answered} note={`من ${examples.length}`} />
        <Metric icon={<CircleCheckBig />} label="متقنة" value={mastered} note="بحسب تقييمك" />
        <Metric icon={<RotateCcw />} label="للمراجعة" value={review} note="تظهر أولًا في التدريب" />
        <Metric icon={<Star />} label="المفضلة" value={favorites} note="محفوظة للرجوع" />
        <Metric icon={<BarChart3 />} label="دقة المحاولات" value={`${accuracy}%`} note={`${wrongAttempts} خطأ من ${totalAttempts}`} />
        <Metric icon={<BookMarked />} label="من أول مرة" value={firstTryCorrect} note="إجابات صحيحة مباشرة" />
      </div>

      <div className="progress-layout">
        <section className="panel-card">
          <div className="panel-card__head"><div><span className="section-kicker">حسب النموذج</span><h2>التغطية السنوية</h2></div></div>
          <div className="year-bars">
            {years.map((year) => {
              const yearItems = examples.filter((example) => example.year === year);
              const done = yearItems.filter((example) => (progress[example.id]?.attempts ?? 0) > 0).length;
              const percent = Math.round((done / yearItems.length) * 100);
              return <div className="year-bar-row" key={year}><strong>{year}</strong><div><span style={{ width: `${percent}%` }} /></div><small>{done}/{yearItems.length}</small></div>;
            })}
          </div>
        </section>

        <section className="panel-card">
          <div className="panel-card__head"><div><span className="section-kicker">أنماط متكررة</span><h2>أكثر أنواع الأخطاء</h2></div></div>
          {topMistakes.length ? <div className="rank-list">{topMistakes.map(([type, count], index) => <div key={type}><span>{index + 1}</span><p>{type}</p><strong>{count}</strong></div>)}</div> : <div className="panel-empty">أكمل جلسة تدريب حتى تظهر الأنماط هنا.</div>}
        </section>
      </div>

      <div className="progress-layout">
        <section className="panel-card">
          <div className="panel-card__head"><div><span className="section-kicker">مفرداتك</span><h2>كلمات لم أفهمها</h2></div><Link className="text-link" to="/library">فتح المكتبة</Link></div>
          {unknownWords.length ? <div className="word-cloud-list">{unknownWords.map(({ word, example }, index) => <div key={`${word}-${index}`}><strong lang="nl" dir="ltr">{word}</strong><span>{example ? `${example.year} · Vraag ${example.questionNo}` : ''}</span></div>)}</div> : <div className="panel-empty">أضف الكلمات من بطاقات المكتبة أو بعد حل السؤال.</div>}
        </section>

        <section className="panel-card">
          <div className="panel-card__head"><div><span className="section-kicker">السجل</span><h2>الجلسات الأخيرة</h2></div></div>
          {sessions.length ? <div className="session-list">{sessions.slice(0, 8).map((session) => <article key={session.id}><div><strong>{new Date(session.completedAt).toLocaleDateString('ar')}</strong><span>{session.total} أسئلة</span></div><p>{session.correctFirstTry} من أول مرة</p><small>{session.wrongAttempts} محاولات خاطئة</small></article>)}</div> : <div className="panel-empty">لا توجد جلسات محفوظة بعد.</div>}
        </section>
      </div>
    </section>
  );
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string | number; note: string }) {
  return <article className="metric-card"><span className="metric-card__icon">{icon}</span><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}
