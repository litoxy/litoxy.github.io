import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SessionRecord } from './types'

interface FormlineDB extends DBSchema {
  sessions: {
    key: string
    value: SessionRecord
    indexes: { 'by-timestamp': string }
  }
}

let dbPromise: Promise<IDBPDatabase<FormlineDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<FormlineDB>('formline-v1', 1, {
      upgrade(db) {
        const store = db.createObjectStore('sessions', { keyPath: 'sessionId' })
        store.createIndex('by-timestamp', 'timestamp')
      },
    })
  }
  return dbPromise
}

export async function saveSession(session: SessionRecord): Promise<void> {
  const db = await getDb()
  await db.put('sessions', session)
}

export async function listSessions(): Promise<SessionRecord[]> {
  const db = await getDb()
  const all = await db.getAllFromIndex('sessions', 'by-timestamp')
  return all.reverse()
}

export async function getSession(id: string): Promise<SessionRecord | undefined> {
  const db = await getDb()
  return db.get('sessions', id)
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('sessions', id)
}