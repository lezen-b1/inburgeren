import { describe, expect, it } from 'vitest';
import { migrateSnapshot, previewSnapshot } from './db';

describe('backup migration', () => {
  it('migrates version 3 backups by adding empty exam sessions', () => {
    const migrated = migrateSnapshot({
      version: 3,
      exportedAt: 123,
      progress: [],
      sessions: [],
    });

    expect(migrated.version).toBe(5);
    expect(migrated.examSessions).toEqual([]);
    expect(migrated.trainingSessions).toEqual([]);
  });

  it('keeps version 4 exam sessions during import preparation', () => {
    const migrated = migrateSnapshot({
      version: 4,
      exportedAt: 123,
      progress: [],
      sessions: [],
      examSessions: [{
        id: 'exam-session-1',
        sessionKey: 'official-2025|all|false',
        modelId: 'official-2025',
        sectionId: 'all',
        startedAt: 1,
        updatedAt: 2,
        currentIndex: 0,
        answers: [],
        firstTryCorrect: 0,
        wrongAttempts: 0,
        selfCheckCount: 0,
        completed: false,
      }],
    });

    expect(migrated.examSessions).toHaveLength(1);
  });

  it('previews a valid version 5 backup before import', () => {
    const preview = previewSnapshot({
      version: 5,
      exportedAt: 123,
      progress: [],
      sessions: [],
      examSessions: [],
      trainingSessions: [],
      unknownWords: [],
      settings: {},
    });
    expect(preview.version).toBe(5);
    expect(preview.progressCount).toBe(0);
  });

  it('rejects a backup with duplicate internal ids', () => {
    expect(() => migrateSnapshot({
      version: 5,
      exportedAt: 123,
      progress: [],
      sessions: [
        { id: 's1', startedAt: 1, completedAt: 2, total: 1, correctFirstTry: 1, wrongAttempts: 0, exampleIds: [], mistakeTypes: [] },
        { id: 's1', startedAt: 1, completedAt: 2, total: 1, correctFirstTry: 1, wrongAttempts: 0, exampleIds: [], mistakeTypes: [] },
      ],
      examSessions: [],
      trainingSessions: [],
      unknownWords: [],
      settings: {},
    })).toThrow(/مكرر/);
  });

  it('rejects a corrupt backup record before import', () => {
    expect(() => migrateSnapshot({
      version: 5,
      exportedAt: 123,
      progress: [{ exampleId: '', attempts: -1 }],
      sessions: [],
      examSessions: [],
      trainingSessions: [],
      unknownWords: [],
      settings: {},
    })).toThrow(/غير صالح/);
  });
});
