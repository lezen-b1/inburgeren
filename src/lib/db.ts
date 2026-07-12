import { openDB, type DBSchema } from 'idb';
import { z } from 'zod';

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
  abandoned?: boolean;
}

export interface ExamSessionQuestionRecord {
  questionId: string;
  selectedOption: string;
  wrongAttempts: number;
  firstTryCorrect: boolean;
  status: 'idle' | 'wrong' | 'correct' | 'revealed';
  draft?: string;
  selfCheck?: boolean;
}

export interface ExamSessionRecord {
  id: string;
  sessionKey: string;
  modelId: string;
  sectionId: string;
  startedAt: number;
  updatedAt: number;
  currentIndex: number;
  answers: ExamSessionQuestionRecord[];
  firstTryCorrect: number;
  wrongAttempts: number;
  selfCheckCount: number;
  completed: boolean;
  completedAt?: number;
  abandoned?: boolean;
}

export interface TrainingSessionAnswerRecord {
  exampleId: string;
  selectedOption?: string;
  draft?: string;
  status: 'idle' | 'wrong' | 'correct' | 'revealed';
  wrongAttempts: number;
  firstTry: boolean;
  unknownWords: string[];
}

export interface TrainingSessionRecord {
  id: string;
  sessionId: string;
  questionIds: string[];
  currentIndex: number;
  answers: TrainingSessionAnswerRecord[];
  wrongAttempts: Record<string, number>;
  startedAt: number;
  updatedAt: number;
  completed: boolean;
  completedIndex?: number;
  reviewShown: boolean;
  abandoned?: boolean;
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
  examSessions: {
    key: string;
    value: ExamSessionRecord;
    indexes: { 'by-updated': number; 'by-model-section': string };
  };
  trainingSessions: {
    key: string;
    value: TrainingSessionRecord;
    indexes: { 'by-updated': number; 'by-completed': number };
  };
  meta: {
    key: string;
    value: MetaRecord;
  };
}

let dbPromise: Promise<import('idb').IDBPDatabase<Nt2Database>> | null = null;

function getDb() {
  dbPromise ??= openDB<Nt2Database>('nt2-lezen-modern-v3', 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('progress', { keyPath: 'exampleId' });
        const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
        sessions.createIndex('by-completed', 'completedAt');
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (oldVersion < 2) {
        const examSessions = db.createObjectStore('examSessions', { keyPath: 'id' });
        examSessions.createIndex('by-updated', 'updatedAt');
        examSessions.createIndex('by-model-section', 'sessionKey');
      }
      if (oldVersion < 3) {
        const trainingSessions = db.createObjectStore('trainingSessions', { keyPath: 'id' });
        trainingSessions.createIndex('by-updated', 'updatedAt');
        trainingSessions.createIndex('by-completed', 'completedIndex');
      }
    },
  });
  return dbPromise;
}

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
  const db = await getDb();
  const rows = await db.getAll('progress');
  return Object.fromEntries(rows.map((row) => [row.exampleId, row]));
}

export async function putProgress(record: ProgressRecord): Promise<void> {
  const db = await getDb();
  await db.put('progress', record);
}

export async function putSession(record: SessionRecord): Promise<void> {
  const db = await getDb();
  await db.put('sessions', record);
}

export async function getSessions(): Promise<SessionRecord[]> {
  const db = await getDb();
  return (await db.getAllFromIndex('sessions', 'by-completed')).reverse();
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('sessions', id);
}

export async function putExamSession(record: ExamSessionRecord): Promise<void> {
  const db = await getDb();
  await db.put('examSessions', { ...record, sessionKey: `${record.modelId}|${record.sectionId}|${record.completed}` });
}

export async function deleteExamSession(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('examSessions', id);
}

export async function abandonExamSession(record: ExamSessionRecord): Promise<void> {
  await putExamSession({ ...record, completed: true, abandoned: true, updatedAt: Date.now(), completedAt: Date.now() });
}

export async function getExamSession(id: string): Promise<ExamSessionRecord | undefined> {
  const db = await getDb();
  return db.get('examSessions', id);
}

export async function getIncompleteExamSession(modelId: string, sectionId: string): Promise<ExamSessionRecord | undefined> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('examSessions', 'by-model-section', `${modelId}|${sectionId}|false`);
  return rows.sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export async function getExamSessions(): Promise<ExamSessionRecord[]> {
  const db = await getDb();
  return (await db.getAllFromIndex('examSessions', 'by-updated')).reverse();
}

export async function putTrainingSession(record: TrainingSessionRecord): Promise<void> {
  const db = await getDb();
  await db.put('trainingSessions', { ...record, completedIndex: record.completed ? 1 : 0 });
}

export async function getActiveTrainingSession(): Promise<TrainingSessionRecord | undefined> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('trainingSessions', 'by-completed', 0);
  return rows.filter((row) => !row.abandoned).sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

export async function getTrainingSessions(): Promise<TrainingSessionRecord[]> {
  const db = await getDb();
  return (await db.getAllFromIndex('trainingSessions', 'by-updated')).reverse();
}

export async function abandonTrainingSession(record: TrainingSessionRecord): Promise<void> {
  await putTrainingSession({ ...record, abandoned: true, completed: true, updatedAt: Date.now() });
}

export async function deleteTrainingSession(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('trainingSessions', id);
}

export interface ExportSnapshot {
  version: 5;
  exportedAt: number;
  progress: ProgressRecord[];
  sessions: SessionRecord[];
  examSessions: ExamSessionRecord[];
  trainingSessions: TrainingSessionRecord[];
  unknownWords: Array<{ exampleId: string; word: string }>;
  settings: Record<string, unknown>;
}

const ProgressRecordSchema = z.object({
  exampleId: z.string().min(1),
  attempts: z.number().int().nonnegative(),
  wrongAttempts: z.number().int().nonnegative(),
  correctCompletions: z.number().int().nonnegative(),
  firstTryCorrect: z.number().int().nonnegative(),
  favorite: z.boolean(),
  review: z.boolean(),
  mastered: z.boolean(),
  opened: z.boolean(),
  unknownWords: z.array(z.string()),
  lastSeen: z.number().nonnegative(),
});

const SessionRecordSchema = z.object({
  id: z.string().min(1),
  startedAt: z.number().nonnegative(),
  completedAt: z.number().nonnegative(),
  total: z.number().int().nonnegative(),
  correctFirstTry: z.number().int().nonnegative(),
  wrongAttempts: z.number().int().nonnegative(),
  exampleIds: z.array(z.string()),
  mistakeTypes: z.array(z.string()),
  abandoned: z.boolean().optional(),
});

const ExamSessionQuestionSchema = z.object({
  questionId: z.string().min(1),
  selectedOption: z.string(),
  wrongAttempts: z.number().int().nonnegative(),
  firstTryCorrect: z.boolean(),
  status: z.enum(['idle', 'wrong', 'correct', 'revealed']),
  draft: z.string().optional(),
  selfCheck: z.boolean().optional(),
});

const ExamSessionRecordSchema = z.object({
  id: z.string().min(1),
  sessionKey: z.string().min(1),
  modelId: z.string().min(1),
  sectionId: z.string().min(1),
  startedAt: z.number().nonnegative(),
  updatedAt: z.number().nonnegative(),
  currentIndex: z.number().int().nonnegative(),
  answers: z.array(ExamSessionQuestionSchema),
  firstTryCorrect: z.number().int().nonnegative(),
  wrongAttempts: z.number().int().nonnegative(),
  selfCheckCount: z.number().int().nonnegative(),
  completed: z.boolean(),
  completedAt: z.number().nonnegative().optional(),
  abandoned: z.boolean().optional(),
});

const TrainingAnswerSchema = z.object({
  exampleId: z.string().min(1),
  selectedOption: z.string().optional(),
  draft: z.string().optional(),
  status: z.enum(['idle', 'wrong', 'correct', 'revealed']),
  wrongAttempts: z.number().int().nonnegative(),
  firstTry: z.boolean(),
  unknownWords: z.array(z.string()),
});

const TrainingSessionRecordSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  questionIds: z.array(z.string().min(1)),
  currentIndex: z.number().int().nonnegative(),
  answers: z.array(TrainingAnswerSchema),
  wrongAttempts: z.record(z.string(), z.number().int().nonnegative()),
  startedAt: z.number().nonnegative(),
  updatedAt: z.number().nonnegative(),
  completed: z.boolean(),
  completedIndex: z.number().int().min(0).max(1).optional(),
  reviewShown: z.boolean(),
  abandoned: z.boolean().optional(),
});

const SnapshotSchema = z.object({
  version: z.union([z.literal(3), z.literal(4), z.literal(5)]),
  exportedAt: z.number().nonnegative(),
  progress: z.array(ProgressRecordSchema),
  sessions: z.array(SessionRecordSchema),
  examSessions: z.array(ExamSessionRecordSchema).optional(),
  trainingSessions: z.array(TrainingSessionRecordSchema).optional(),
  unknownWords: z.array(z.object({ exampleId: z.string().min(1), word: z.string().min(1) })).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

function assertUniqueIds(label: string, rows: Array<{ id?: string; exampleId?: string }>) {
  const seen = new Set<string>();
  for (const row of rows) {
    const id = row.id ?? row.exampleId;
    if (!id) continue;
    if (seen.has(id)) throw new Error(`ملف النسخة الاحتياطية يحتوي معرفًا مكررًا في ${label}: ${id}`);
    seen.add(id);
  }
}

export async function exportSnapshot(): Promise<ExportSnapshot> {
  const db = await getDb();
  const progress = await db.getAll('progress');
  return {
    version: 5,
    exportedAt: Date.now(),
    progress,
    sessions: await db.getAll('sessions'),
    examSessions: await db.getAll('examSessions'),
    trainingSessions: await db.getAll('trainingSessions'),
    unknownWords: progress.flatMap((row) => row.unknownWords.map((word) => ({ exampleId: row.exampleId, word }))),
    settings: {},
  };
}

export function migrateSnapshot(snapshot: unknown): ExportSnapshot {
  const parsed = SnapshotSchema.safeParse(snapshot);
  if (!parsed.success) throw new Error(`ملف النسخة الاحتياطية غير صالح: ${parsed.error.issues[0]?.message ?? 'تنسيق غير معروف'}`);
  const valid = parsed.data;
  assertUniqueIds('progress', valid.progress);
  assertUniqueIds('sessions', valid.sessions);
  assertUniqueIds('examSessions', valid.examSessions ?? []);
  assertUniqueIds('trainingSessions', valid.trainingSessions ?? []);
  return {
    version: 5,
    exportedAt: valid.exportedAt,
    progress: valid.progress,
    sessions: valid.sessions,
    examSessions: valid.examSessions ?? [],
    trainingSessions: valid.trainingSessions ?? [],
    unknownWords: valid.unknownWords ?? valid.progress.flatMap((row) => row.unknownWords.map((word) => ({ exampleId: row.exampleId, word }))),
    settings: valid.settings ?? {},
  };
}

export function previewSnapshot(snapshot: unknown) {
  const migrated = migrateSnapshot(snapshot);
  return {
    version: migrated.version,
    exportedAt: migrated.exportedAt,
    progressCount: migrated.progress.length,
    sessionsCount: migrated.sessions.length,
    examSessionsCount: migrated.examSessions.length,
    trainingSessionsCount: migrated.trainingSessions.length,
    unknownWordsCount: migrated.unknownWords.length,
  };
}

export async function importSnapshot(snapshot: unknown): Promise<void> {
  const migrated = migrateSnapshot(snapshot);
  const db = await getDb();
  const tx = db.transaction(['progress', 'sessions', 'examSessions', 'trainingSessions'], 'readwrite');
  await Promise.all([
    tx.objectStore('progress').clear(),
    tx.objectStore('sessions').clear(),
    tx.objectStore('examSessions').clear(),
    tx.objectStore('trainingSessions').clear(),
  ]);
  for (const row of migrated.progress) await tx.objectStore('progress').put(row);
  for (const row of migrated.sessions) await tx.objectStore('sessions').put(row);
  for (const row of migrated.examSessions) await tx.objectStore('examSessions').put(row);
  for (const row of migrated.trainingSessions) await tx.objectStore('trainingSessions').put(row);
  await tx.done;
}

export async function clearDatabase(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['progress', 'sessions', 'examSessions', 'trainingSessions', 'meta'], 'readwrite');
  await Promise.all([
    tx.objectStore('progress').clear(),
    tx.objectStore('sessions').clear(),
    tx.objectStore('examSessions').clear(),
    tx.objectStore('trainingSessions').clear(),
    tx.objectStore('meta').clear(),
  ]);
  await tx.done;
}
