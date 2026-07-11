import { useEffect, useRef, useState } from 'react';
import { Bookmark, Check, Eye, EyeOff, RotateCcw, Share2, Star } from 'lucide-react';
import type { Example } from '../lib/schema';
import { levelLabels, skillLabels } from '../lib/data';
import { useProgress } from '../lib/ProgressContext';
import { useToast } from '../lib/ToastContext';
import { SourceLink } from './SourceLink';

export function StudyCard({ example, forceOpen = false }: { example: Example; forceOpen?: boolean }) {
  const [revealed, setRevealed] = useState(forceOpen);
  const [word, setWord] = useState('');
  const cardRef = useRef<HTMLElement>(null);
  const { get, toggle, markOpened, addUnknownWord } = useProgress();
  const { showToast } = useToast();
  const progress = get(example.id);

  useEffect(() => {
    if (!forceOpen) return;
    setRevealed(true);
    window.setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  }, [forceOpen]);

  const reveal = async () => {
    setRevealed((value) => !value);
    if (!revealed) await markOpened(example.id);
  };

  const share = async () => {
    const base = window.location.protocol === 'file:'
      ? window.location.href.split('#')[0]
      : `${window.location.origin}${window.location.pathname}`;
    const url = `${base}#/library?example=${encodeURIComponent(example.id)}`;
    const payload = { title: `${example.year} · Vraag ${example.questionNo}`, text: example.question, url };
    try {
      if (navigator.share) await navigator.share(payload);
      else await navigator.clipboard.writeText(url);
      showToast(window.location.protocol === 'file:' ? 'نُسخ رابط محلي؛ يصبح قابلًا للمشاركة بعد نشر الموقع.' : 'تم تجهيز رابط نظيف لهذا المثال.', 'success');
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') showToast('تعذّر نسخ الرابط في هذا المتصفح.', 'warning');
    }
  };

  const saveWord = async () => {
    if (!word.trim()) return;
    await addUnknownWord(example.id, word);
    setWord('');
    showToast('أضيفت الكلمة إلى قائمة الكلمات غير المفهومة.', 'success');
  };

  return (
    <article className="study-card" id={`example-${example.id}`} ref={cardRef}>
      <header className="study-card__header">
        <div className="chip-row">
          <span className="chip chip--purple">{example.year}</span>
          <span className="chip">Vraag {example.questionNo}</span>
          <span className="chip">{levelLabels[example.level]}</span>
          <span className="chip">{skillLabels[example.skill]}</span>
        </div>
        <div className="card-action-row">
          <button
            className={`small-icon-button${progress.favorite ? ' is-active' : ''}`}
            type="button"
            onClick={() => void toggle(example.id, 'favorite')}
            aria-pressed={progress.favorite}
            title="المفضلة"
          ><Star size={18} /></button>
          <button className="small-icon-button" type="button" onClick={() => void share()} title="مشاركة المثال">
            <Share2 size={18} />
          </button>
        </div>
      </header>

      <div className="study-card__title-row">
        <div>
          <small lang="nl">Tekst</small>
          <h3 lang="nl" dir="ltr">{example.title}</h3>
        </div>
        <span className={`mode-badge mode-badge--${example.mode}`}>
          {example.mode === 'multiple-choice' ? 'اختيارات أصلية' : 'تقييم ذاتي'}
        </span>
      </div>

      <section className="question-panel">
        <small>السؤال</small>
        <p lang="nl" dir="ltr">{example.question}</p>
      </section>

      {!revealed ? (
        <div className="hidden-answer-panel">
          <EyeOff size={24} aria-hidden="true" />
          <div>
            <strong>الإجابة والدليل مخفيان</strong>
            <p>حدّد كلمات البحث وفكّر في المعنى قبل الكشف.</p>
          </div>
          <button className="button button--primary" type="button" onClick={() => void reveal()}>
            <Eye size={17} /> إظهار الجواب والدليل
          </button>
        </div>
      ) : (
        <div className="reveal-stack">
          <section className="answer-panel">
            <small>الإجابة المعتمدة</small>
            <p lang="nl" dir="ltr">{example.answer}</p>
          </section>

          {example.options.length > 0 && (
            <section className="option-review">
              <h4>الاختيارات الأصلية</h4>
              <div className="option-review__list">
                {example.options.map((option) => {
                  const correct = option.label === example.correctOption;
                  return (
                    <div key={option.label} className={`review-option${correct ? ' is-correct' : ''}`}>
                      <span>{option.label}</span>
                      <p lang="nl" dir="ltr">{option.text}</p>
                      <small>{correct ? 'الإجابة الرسمية' : 'غير مطابق لمفتاح الإجابة الرسمي'}</small>
                    </div>
                  );
                })}
              </div>
              <p className="honesty-note">لا يضيف الموقع سببًا مخترعًا لكل مشتّت؛ الدليل أدناه هو المرجع للحكم.</p>
            </section>
          )}

          <section className="evidence-grid">
            <div className="evidence-box">
              <small>الدليل من النص</small>
              <p lang="nl" dir="ltr">{example.evidence}</p>
            </div>
            <div className="evidence-box evidence-box--accent">
              <small>الرابط المعنوي</small>
              <p lang="nl" dir="ltr">{example.pair}</p>
            </div>
          </section>

          <section className="arabic-explanation">
            <div><strong>المعنى بالعربية</strong><p>{example.meaning}</p></div>
            <div><strong>كيف وجدت الإجابة؟</strong><p>{example.explanation}</p></div>
          </section>

          <div className="source-and-word">
            <SourceLink example={example} />
            <div className="unknown-word-entry">
              <label htmlFor={`word-${example.id}`}>كلمة لم أفهمها</label>
              <div>
                <input
                  id={`word-${example.id}`}
                  value={word}
                  onChange={(event) => setWord(event.target.value)}
                  placeholder="اكتب الكلمة الهولندية"
                  lang="nl"
                  dir="ltr"
                />
                <button className="button button--secondary" type="button" onClick={() => void saveWord()}>
                  حفظ
                </button>
              </div>
            </div>
          </div>

          <button className="collapse-button" type="button" onClick={() => void reveal()}>
            <EyeOff size={16} /> إخفاء الجواب مرة أخرى
          </button>
        </div>
      )}

      <footer className="study-card__footer">
        <button
          className={`learning-toggle${progress.mastered ? ' is-active is-mastered' : ''}`}
          type="button"
          onClick={() => void toggle(example.id, 'mastered')}
          aria-pressed={progress.mastered}
        ><Check size={17} /> {progress.mastered ? 'متقنة' : 'تعلّمتها'}</button>
        <button
          className={`learning-toggle${progress.review ? ' is-active is-review' : ''}`}
          type="button"
          onClick={() => void toggle(example.id, 'review')}
          aria-pressed={progress.review}
        ><RotateCcw size={17} /> {progress.review ? 'ضمن المراجعة' : 'تحتاج مراجعة'}</button>
        <button
          className={`learning-toggle${progress.favorite ? ' is-active' : ''}`}
          type="button"
          onClick={() => void toggle(example.id, 'favorite')}
          aria-pressed={progress.favorite}
        ><Bookmark size={17} /> {progress.favorite ? 'محفوظة' : 'حفظ'}</button>
      </footer>
    </article>
  );
}
