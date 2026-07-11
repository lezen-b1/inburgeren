import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';
import { TrainingPage } from './pages/TrainingPage';
import { dataError } from './lib/data';

export function App() {
  if (dataError) {
    return (
      <Layout>
        <section className="section shell">
          <div className="fatal-error__card">
            <span className="section-kicker">خطأ في البيانات</span>
            <h1>تعذر تحميل أمثلة التدريب</h1>
            <p>{dataError}</p>
            <button className="button button--primary" onClick={() => window.location.reload()}>إعادة التحميل</button>
          </div>
        </section>
      </Layout>
    );
  }
  return (
    <Layout>
      <Routes>
        <Route path="/home" element={<HomePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/train" element={<TrainingPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Layout>
  );
}
