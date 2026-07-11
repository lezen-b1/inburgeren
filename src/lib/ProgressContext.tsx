import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  clearDatabase,
  emptyProgress,
  exportSnapshot,
  getAllProgress,
  getSessions,
  importSnapshot,
  putProgress,
  putSession,
  type ExportSnapshot,
  type ProgressRecord,
  type SessionRecord,
} from './db';

interface AnswerUpdate {
  correct: boolean;
  firstTry: boolean;
  hadWrong: boolean;
}

interface ProgressContextValue {
  ready: boolean;
  progress: Record<string, ProgressRecord>;
  sessions: SessionRecord[];
  get: (exampleId: string) => ProgressRecord;
  toggle: (exampleId: string, key: 'favorite' | 'review' | 'mastered') => Promise<void>;
  markOpened: (exampleId: string) => Promise<void>;
  recordAnswer: (exampleId: string, update: AnswerUpdate) => Promise<void>;
  addUnknownWord: (exampleId: string, word: string) => Promise<void>;
  saveSession: (session: SessionRecord) => Promise<void>;
  downloadBackup: () => Promise<void>;
  restoreBackup: (file: File) => Promise<void>;
  clearAll: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<Record<string, ProgressRecord>>({});
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  const reload = useCallback(async () => {
    const [progressRows, sessionRows] = await Promise.all([getAllProgress(), getSessions()]);
    setProgress(progressRows);
    setSessions(sessionRows);
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const get = useCallback(
    (exampleId: string) => progress[exampleId] ?? emptyProgress(exampleId),
    [progress],
  );

  const updateRecord = useCallback(
    async (exampleId: string, updater: (record: ProgressRecord) => ProgressRecord) => {
      const next = updater(progress[exampleId] ?? emptyProgress(exampleId));
      setProgress((current) => ({ ...current, [exampleId]: next }));
      await putProgress(next);
    },
    [progress],
  );

  const toggle = useCallback(
    async (exampleId: string, key: 'favorite' | 'review' | 'mastered') => {
      await updateRecord(exampleId, (record) => {
        const next = { ...record, [key]: !record[key], lastSeen: Date.now() };
        if (key === 'mastered' && next.mastered) next.review = false;
        if (key === 'review' && next.review) next.mastered = false;
        return next;
      });
    },
    [updateRecord],
  );

  const markOpened = useCallback(
    async (exampleId: string) => {
      await updateRecord(exampleId, (record) => ({ ...record, opened: true, lastSeen: Date.now() }));
    },
    [updateRecord],
  );

  const recordAnswer = useCallback(
    async (exampleId: string, update: AnswerUpdate) => {
      await updateRecord(exampleId, (record) => ({
        ...record,
        attempts: record.attempts + 1,
        wrongAttempts: record.wrongAttempts + (update.correct ? 0 : 1),
        correctCompletions: record.correctCompletions + (update.correct ? 1 : 0),
        firstTryCorrect: record.firstTryCorrect + (update.correct && update.firstTry ? 1 : 0),
        review: update.correct ? update.hadWrong || record.review : true,
        opened: true,
        lastSeen: Date.now(),
      }));
    },
    [updateRecord],
  );

  const addUnknownWord = useCallback(
    async (exampleId: string, word: string) => {
      const value = word.trim();
      if (!value) return;
      await updateRecord(exampleId, (record) => ({
        ...record,
        unknownWords: [...new Set([...record.unknownWords, value])],
        lastSeen: Date.now(),
      }));
    },
    [updateRecord],
  );

  const saveSession = useCallback(async (session: SessionRecord) => {
    await putSession(session);
    setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)]);
  }, []);

  const downloadBackup = useCallback(async () => {
    const snapshot = await exportSnapshot();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nt2-lezen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const restoreBackup = useCallback(
    async (file: File) => {
      const snapshot = JSON.parse(await file.text()) as ExportSnapshot;
      await importSnapshot(snapshot);
      await reload();
    },
    [reload],
  );

  const clearAll = useCallback(async () => {
    await clearDatabase();
    setProgress({});
    setSessions([]);
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      ready,
      progress,
      sessions,
      get,
      toggle,
      markOpened,
      recordAnswer,
      addUnknownWord,
      saveSession,
      downloadBackup,
      restoreBackup,
      clearAll,
    }),
    [
      ready,
      progress,
      sessions,
      get,
      toggle,
      markOpened,
      recordAnswer,
      addUnknownWord,
      saveSession,
      downloadBackup,
      restoreBackup,
      clearAll,
    ],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress must be used within ProgressProvider');
  return value;
}
