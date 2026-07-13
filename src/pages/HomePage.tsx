import { ArrowLeft, BookOpenText, Brain, CheckCircle2, Gamepad2, Layers3, SearchCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { examples } from '../lib/data';
import { useProgress } from '../lib/ProgressContext';
import { paraphrasePairs } from '../lib/paraphrasePairs';
import { examModels } from '../lib/exams';
import { usePageMeta } from '../lib/pageMeta';
import { useI18n } from '../lib/i18n';

export function HomePage() {
  const { t, skillLabel } = useI18n();
  usePageMeta(t('homeMeta'));
  const { progress, ready } = useProgress();
  const rows = Object.values(progress);
  const mastered = rows.filter((row) => row.mastered).length;
  const review = rows.filter((row) => row.review).length;
  const answered = rows.filter((row) => row.attempts > 0).length;
  const officialQuestions = examModels.reduce((sum, model) => sum + model.questionCount, 0);

  return (
    <>
      <section className="hero-modern">
        <div className="hero-modern__glow" aria-hidden="true" />
        <div className="shell hero-modern__grid">
          <div className="hero-modern__copy">
            <span className="eyebrow"><Sparkles size={15} /> Staatsexamen NT2 · Programma I</span>
            <h1>{t('homeHeroTitle')}</h1>
            <p>{t('homeHeroText')}</p>
            <div className="hero-modern__actions">
              <Link className="button button--primary button--large" to="/train">
                {t('startFive')} <ArrowLeft size={18} aria-hidden="true" />
              </Link>
              <Link className="button button--secondary button--large" to="/models">
                {t('openModels')}
              </Link>
              <Link className="button button--light button--large" to="/phrases">
                <Gamepad2 size={18} aria-hidden="true" /> {t('phraseGame')}
              </Link>
            </div>
            <div className="hero-modern__metrics" aria-label={t('contentSummary')}>
              <div><strong>{officialQuestions}</strong><span>{t('officialQuestionsStructured')}</span></div>
              <div><strong>2023–2025</strong><span>{t('completeOfficialModels')}</span></div>
              <div><strong>{paraphrasePairs.length}</strong><span>{t('meaningRelationsDaily')}</span></div>
            </div>
          </div>

          <div className="hero-demo-card" aria-label="Parafrase voorbeeld">
            <div className="hero-demo-card__head">
              <span>Parafrase</span>
              <span className="status-pill status-pill--success">{t('oneMeaning')}</span>
            </div>
            <div className="language-quote">
              <small>In de tekst</small>
              <p lang="nl" dir="ltr">heel goed je best doen</p>
            </div>
            <div className="meaning-equals">≈</div>
            <div className="language-quote language-quote--accent">
              <small>In het antwoord</small>
              <p lang="nl" dir="ltr">hard werken</p>
            </div>
            <div className="hero-demo-card__note">
              <CheckCircle2 size={20} aria-hidden="true" />
              <span>{t('wordsDifferentMeaning')}</span>
            </div>
            <Link className="hero-demo-card__link" to="/phrases">{t('learnPhrasesDaily')} <ArrowLeft size={16} /></Link>
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t('practicalMethod')}</span>
            <h2>{t('trainMeaningExam')}</h2>
          </div>
        </div>
        <div className="feature-grid">
          <article className="feature-card">
            <span className="feature-card__icon"><Brain /></span>
            <h3>{t('meaningBeforeWord')}</h3>
            <p>{t('meaningBeforeWordText')}</p>
          </article>
          <article className="feature-card">
            <span className="feature-card__icon"><SearchCheck /></span>
            <h3>{t('questionThenEvidence')}</h3>
            <p>{t('questionThenEvidenceText')}</p>
          </article>
          <article className="feature-card">
            <span className="feature-card__icon"><Gamepad2 /></span>
            <h3>{t('dailyShortRepeat')}</h3>
            <p>{t('dailyShortRepeatText')}</p>
          </article>
          <article className="feature-card">
            <span className="feature-card__icon"><Layers3 /></span>
            <h3>{t('reviewMistakes')}</h3>
            <p>{t('reviewMistakesText')}</p>
          </article>
        </div>
      </section>

      <section className="section section--soft">
        <div className="shell">
          <div className="section-heading section-heading--split">
            <div>
              <span className="section-kicker">{t('deviceProgress')}</span>
              <h2>{ready ? t('compactDashboard') : t('loadingProgress')}</h2>
            </div>
            <Link className="text-link" to="/progress">{t('details')} <ArrowLeft size={16} /></Link>
          </div>
          <div className="dashboard-metrics">
            <article><span>{t('answered')}</span><strong>{answered}</strong><small>{t('fromExamples', { count: examples.length })}</small></article>
            <article><span>{t('mastered')}</span><strong>{mastered}</strong><small>{t('markedYourself')}</small></article>
            <article><span>{t('reviewNeeded')}</span><strong>{review}</strong><small>{t('appearsFirstTraining')}</small></article>
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{t('skills')}</span>
            <h2>{t('chooseTrap')}</h2>
          </div>
        </div>
        <div className="skill-grid">
          {['synonyms', 'negation', 'cause-effect', 'grammar-transform', 'inference-summary'].map((skill) => {
            const count = examples.filter((example) => example.skill === skill).length;
            return (
              <Link key={skill} className="skill-card" to={`/library?skill=${skill}`}>
                <span>{skillLabel(skill)}</span><strong>{count}</strong><small>{t('examplesCount')}</small>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
