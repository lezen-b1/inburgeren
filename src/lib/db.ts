import { openDB, type DBSchema } from 'idb';

export interface ProgressRecord {
  exampleId: string;
  attempts: number;
  wrongAttempts: number;
  correctCompletions: number;
  firstTryCorrect: number;
  favorite: boolean;
  review: boolean;
  mastered: boolean;
  opened: boolean;
  unknownWords: string[];
  lastSeen: number;
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  completedAt: number;
  total: number;
  correctFirstTry: number;
  wrongAttempts: number;
  exampleIds: string[];
  mistakeTypes: string[];
}

interface MetaRecord {
  key: string;
  value: unknown;
}

interface Nt2Database extends DBSchema {
  progress: {
    key: string;
    value: ProgressRecord;
  };
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: { 'by-completed': number };
  };
  meta: {
    key: string;
    value: MetaRecord;
  };
}

const dbPromise = openDB<Nt2Database>('nt2-lezen-modern-v3', 1, {
  upgrade(db) {
    db.createObjectStore('progress', { keyPath: 'exampleId' });
    const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
    sessions.createIndex('by-completed', 'completedAt');
    db.createObjectStore('meta', { keyPath: 'key' });
  },
});

export const emptyProgress = (exampleId: string): ProgressRecord => ({
  exampleId,
  attempts: 0,
  wrongAttempts: 0,
  correctCompletions: 0,
  firstTryCorrect: 0,
  favorite: false,
  review: false,
  mastered: false,
  opened: false,
  unknownWords: [],
  lastSeen: 0,
});

export async function getAllProgress(): Promise<Record<string, ProgressRecord>> {
  const db = await dbPromise;
  const rows = await db.getAll('progress');
  return Object.fromEntries(rows.map((row) => [row.exampleId, row]));
}

export async function putProgress(record: ProgressRecord): Promise<void> {
  const db = await dbPromise;
  await db.put('progress', record);
}

export async function putSession(record: SessionRecord): Promise<void> {
  const db = await dbPromise;
  await db.put('sessions', record);
}

export async function getSessions(): Promise<SessionRecord[]> {
  const db = await dbPromise;
  return (await db.getAllFromIndex('sessions', 'by-completed')).reverse();
}

export interface ExportSnapshot {
  version: 3;
  exportedAt: number;
  progress: ProgressRecord[];
  sessions: SessionRecord[];
}

export async function exportSnapshot(): Promise<ExportSnapshot> {
  const db = await dbPromise;
  return {
    version: 3,
    exportedAt: Date.now(),
    progress: await db.getAll('progress'),
    sessions: await db.getAll('sessions'),
  };
}

export async function importSnapshot(snapshot: ExportSnapshot): Promise<void> {
  if (snapshot.version !== 3 || !Array.isArray(snapshot.progress) || !Array.isArray(snapshot.sessions)) {
    throw new Error('ملف النسخة الاحتياطية غير صالح.');
  }
  const db = await dbPromise;
  const tx = db.transaction(['progress', 'sessions'], 'readwrite');
  await Promise.all([
    tx.objectStore('progress').clear(),
    tx.objectStore('sessions').clear(),
  ]);
  for (const row of snapshot.progress) await tx.objectStore('progress').put(row);
  for (const row of snapshot.sessions) await tx.objectStore('sessions').put(row);
  await tx.done;
}

export async function clearDatabase(): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(['progress', 'sessions', 'meta'], 'readwrite');
  await Promise.all([
    tx.objectStore('progress').clear(),
    tx.objectStore('sessions').clear(),
    tx.objectStore('meta').clear(),
  ]);
  await tx.done;
}
