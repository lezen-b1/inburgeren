import { Home, Library, SearchX } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { usePageMeta } from '../lib/pageMeta';

export function NotFoundPage() {
  const location = useLocation();
  usePageMeta('الصفحة غير موجودة');

  return (
    <section className="section shell checkpoint-page">
      <div className="summary-card">
        <span className="summary-icon"><SearchX /></span>
        <span className="section-kicker">404</span>
        <h1>الصفحة غير موجودة</h1>
        <p dir="ltr">{location.pathname}{location.search}{location.hash}</p>
        <div className="summary-actions">
          <Link className="button button--primary" to="/home"><Home size={17} /> الرئيسية</Link>
          <Link className="button button--secondary" to="/models">النماذج</Link>
          <Link className="button button--secondary" to="/sources"><Library size={17} /> المصادر</Link>
        </div>
      </div>
    </section>
  );
}
