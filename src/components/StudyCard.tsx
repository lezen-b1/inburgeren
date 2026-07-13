import { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Check, CheckCircle2, EyeOff, RotateCcw, Share2, Star, XCircle } from 'lucide-react';
import type { Example } from '../lib/schema';
import { paraphrasePairs, type ParaphrasePair } from '../lib/paraphrasePairs';
import { useProgress } from '../lib/ProgressContext';
import { useToast } from '../lib/ToastContext';
import { SourceLink } from './SourceLink';
import { useI18n } from '../lib/i18n';

function optionSeed(pair: ParaphrasePair) {
  return pair.id.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 5), pair.questionNo);
}

function pickPrimaryPair(example: Example) {
  const pairs = paraphrasePairs.filter((pair) => pair.exampleId === example.id);
  return pairs.find((pair) => example.evidence.toLocaleLowerCase('nl').includes(pair.left.toLocaleLowerCase('nl')))
    ?? pairs[0]
    ?? {
      id: `${example.id}--fallback`,
      exampleId: example.id,
      left: example.evidence,
      right: example.answer,
      meaning: example.meaning,
      explanation: example.explanation,
      year: example.year,
      questionNo: example.questionNo,
      title: example.title,
      transformationType: example.transformationType,
      skill: example.skill,
      level: example.level,
    };
}

function makeMeaningOptions(pair: ParaphrasePair) {
  const seed = optionSeed(pair);
  const distractors = paraphrasePairs
    .filter((item) => item.id !== pair.id && item.right.trim() && item.right !== pair.right)
    .sort((a, b) => ((a.questionNo * 17 + seed) % 53) - ((b.questionNo * 17 + seed) % 53))
    .slice(0, 2)
    .map((item) => item.right);
  return [pair.right, ...distractors]
    .slice(0, 3)
    .sort((a, b) => ((a.length + seed) % 13) - ((b.length + seed) % 13));
}

export function StudyCard({ example, forceOpen = false }: { example: Example; forceOpen?: boolean }) {
  const { locale, t, skillLabel, levelLabel } = useI18n();
  const [selected, setSelected] = useState('');
  const [hadWrong, setHadWrong] = useState(false);
  const [revealed, setRevealed] = useState(forceOpen);
  const [word, setWord] = useState('');
  const cardRef = useRef<HTMLElement>(null);
  const { get, toggle, markOpened, recordAnswer, addUnknownWord } = useProgress();
  const { showToast } = useToast();
  const progress = get(example.id);
  const primaryPair = useMemo(() => pickPrimaryPair(example), [example]);
  const options = useMemo(() => makeMeaningOptions(primaryPair), [primaryPair]);
  const answered = selected.length > 0;
  const correct = selected === primaryPair.right;
  const meaning = locale === 'ar' ? example.meaning : t('curatedMeaningFallback');
  const explanation = locale === 'ar' ? example.explanation : t('curatedExplanationFallback');

  useEffect(() => {
    setSelected('');
    setHadWrong(false);
    setRevealed(forceOpen);
  }, [example.id, forceOpen]);

  useEffect(() => {
    if (!forceOpen) return;
    setRevealed(true);
    window.setTimeout(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  }, [forceOpen]);

  const choose = async (option: string) => {
    if (correct) return;
    setSelected(option);
    const isCorrect = option === primaryPair.right;
    if (!isCorrect) setHadWrong(true);
    if (isCorrect) setRevealed(true);
    await recordAnswer(example.id, { correct: isCorrect, firstTry: !hadWrong, hadWrong });
  };

  const revealDetails = async () => {
    setRevealed(true);
    await markOpened(example.id);
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
      showToast(window.location.protocol === 'file:' ? t('localLinkCopied') : t('shareLinkReady'), 'success');
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') showToast(t('copyFailed'), 'warning');
    }
  };

  const saveWord = async () => {
    if (!word.trim()) return;
    await addUnknownWord(example.id, word);
    setWord('');
    showToast(t('wordSaved'), 'success');
  };

  return (
    <article className="study-card" id={`example-${example.id}`} ref={cardRef}>
      <header className="study-card__header">
        <div className="chip-row">
          <span className="chip chip--purple">{example.year}</span>
          <span className="chip">Vraag {example.questionNo}</span>
          <span className="chip">{levelLabel(example.level)}</span>
          <span className="chip">{skillLabel(example.skill)}</span>
        </div>
        <div className="card-action-row">
          <button
            className={`small-icon-button${progress.favorite ? ' is-active' : ''}`}
            type="button"
            onClick={() => void toggle(example.id, 'favorite')}
            aria-pressed={progress.favorite}
            title={t('favorite')}
          ><Star size={18} /></button>
          <button className="small-icon-button" type="button" onClick={() => void share()} title={t('shareExample')}>
            <Share2 size={18} />
          </button>
        </div>
      </header>

      <div className="study-card__title-row">
        <div>
          <small lang="nl">Parafrase uit het examen</small>
          <h3 lang="nl" dir="ltr">{example.title}</h3>
        </div>
        <span className={`mode-badge mode-badge--${example.mode}`}>
          {example.mode === 'multiple-choice' ? t('originalChoices') : t('selfCheck')}
        </span>
      </div>

      <section className="question-panel library-prompt">
        <small>{t('textMaySay')}</small>
        <p lang="nl" dir="ltr">{primaryPair.left}</p>
        <span>{t('chooseSameMeaning')}</span>
      </section>

      <div className="meaning-choice-panel">
        <div className="meaning-choice-panel__head">
          <strong>{t('whichPhraseMatches')}</strong>
          <span>{answered ? (correct ? t('correct') : t('tryAgain')) : t('chooseThree')}</span>
        </div>
        <div className="meaning-options">
          {options.map((option) => {
            const isSelected = selected === option;
            const isCorrect = option === primaryPair.right;
            const showCorrect = correct && isCorrect;
            return (
              <button
                key={option}
                className={`meaning-option${isSelected ? ' is-selected' : ''}${showCorrect ? ' is-correct' : ''}${isSelected && !isCorrect ? ' is-wrong' : ''}`}
                type="button"
                onClick={() => void choose(option)}
                disabled={correct}
              >
                <span lang="nl" dir="ltr">{option}</span>
              </button>
            );
          })}
        </div>

        {answered && !correct && (
          <div className="feedback feedback--wrong" role="status">
            <XCircle size={21} />
            <div><strong>{t('notClosest')}</strong><p>{t('sameIdeaNotSimilarWord')}</p></div>
          </div>
        )}
        {correct && (
          <div className="feedback feedback--correct" role="status">
            <CheckCircle2 size={21} />
            <div><strong>{t('correct')}</strong><p>{meaning}</p></div>
          </div>
        )}
      </div>

      {revealed ? (
        <div className="reveal-stack">
          <section className="question-panel">
            <small>{t('originalQuestion')}</small>
            <p lang="nl" dir="ltr">{example.question}</p>
          </section>

          <section className="answer-panel">
            <small>{t('officialAnswer')}</small>
            <p lang="nl" dir="ltr">{example.answer}</p>
          </section>

          {example.options.length > 0 && (
            <section className="option-review">
              <h4>{t('originalChoices')}</h4>
              <div className="option-review__list">
                {example.options.map((option) => {
                  const correct = option.label === example.correctOption;
                  return (
                    <div key={option.label} className={`review-option${correct ? ' is-correct' : ''}`}>
                      <span>{option.label}</span>
                      <p lang="nl" dir="ltr">{option.text}</p>
                      <small>{correct ? t('officialKeyAnswer') : t('notOfficialKey')}</small>
                    </div>
                  );
                })}
              </div>
              <p className="honesty-note">{t('noInventedDistractors')}</p>
            </section>
          )}

          <section className="evidence-grid">
            <div className="evidence-box">
              <small>{t('evidenceFromText')}</small>
              <p lang="nl" dir="ltr">{example.evidence}</p>
            </div>
            <div className="evidence-box evidence-box--accent">
              <small>{t('meaningLink')}</small>
              <p lang="nl" dir="ltr">{primaryPair.left} ↔ {primaryPair.right}</p>
            </div>
          </section>

          <section className="arabic-explanation">
            <div><strong>{t('meaning')}</strong><p>{meaning}</p></div>
            <div><strong>{t('explanation')}</strong><p>{explanation}</p></div>
          </section>

          <div className="source-and-word">
            <SourceLink example={example} />
            <div className="unknown-word-entry">
              <label htmlFor={`word-${example.id}`}>{t('unknownWord')}</label>
              <div>
                <input
                  id={`word-${example.id}`}
                  value={word}
                  onChange={(event) => setWord(event.target.value)}
                  placeholder={t('dutchWordPlaceholder')}
                  lang="nl"
                  dir="ltr"
                />
                <button className="button button--secondary" type="button" onClick={() => void saveWord()}>
                  {t('save')}
                </button>
              </div>
            </div>
          </div>

          <button className="collapse-button" type="button" onClick={() => setRevealed(false)}>
            <EyeOff size={16} /> {t('hideAnswerAgain')}
          </button>
        </div>
      ) : (
        <div className="hidden-answer-panel hidden-answer-panel--compact">
          <div>
            <strong>{t('detailsHidden')}</strong>
            <p>{t('chooseFirstReveal')}</p>
          </div>
          <button className="button button--secondary" type="button" onClick={() => void revealDetails()}>
            {t('revealExplanation')}
          </button>
        </div>
      )}

      <footer className="study-card__footer">
        <button
          className={`learning-toggle${progress.mastered ? ' is-active is-mastered' : ''}`}
          type="button"
          onClick={() => void toggle(example.id, 'mastered')}
          aria-pressed={progress.mastered}
        ><Check size={17} /> {progress.mastered ? t('learnedDone') : t('learned')}</button>
        <button
          className={`learning-toggle${progress.review ? ' is-active is-review' : ''}`}
          type="button"
          onClick={() => void toggle(example.id, 'review')}
          aria-pressed={progress.review}
        ><RotateCcw size={17} /> {progress.review ? t('inReview') : t('addReview')}</button>
        <button
          className={`learning-toggle${progress.favorite ? ' is-active' : ''}`}
          type="button"
          onClick={() => void toggle(example.id, 'favorite')}
          aria-pressed={progress.favorite}
        ><Bookmark size={17} /> {progress.favorite ? t('saved') : t('save')}</button>
      </footer>
    </article>
  );
}
