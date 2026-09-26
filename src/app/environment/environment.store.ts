/**
 * V-Me Environment Store & Library
 * Manages environment records, import/export, and persistence.
 * Ref: Environment Addendum §19.19
 */

import { BehaviorSubject, Observable } from 'rxjs';
import {
  EnvironmentRecord,
  ApartmentDef,
} from './environment.models';
import { ApartmentBuilder } from './apartment-builder';

const DB_NAME = 'vtuber_environments';
const DB_VERSION = 1;
const STORE_NAME = 'environments';
const BLOB_STORE_NAME = 'blobs';

export class EnvironmentStore {
  private db: IDBDatabase | null = null;
  private environments$ = new BehaviorSubject<EnvironmentRecord[]>([]);

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.db = req.result;
        this.loadEnvironments();
        resolve();
      };

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('source', 'source', { unique: false });
        }
        if (!db.objectStoreNames.contains(BLOB_STORE_NAME)) {
          // Keyless store: blobs are put/get by an explicit string key (blobKey),
          // not by an inline keyPath — see importEnvironment/exportEnvironment below.
          db.createObjectStore(BLOB_STORE_NAME);
        }
      };
    });
  }

  async loadEnvironments(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records = req.result as EnvironmentRecord[];
        // Add default if none exists
        if (!records.find((r) => r.id === 'apartment-default')) {
          records.unshift(this.createDefaultEnvironment());
        }
        this.environments$.next(records);
        resolve();
      };
    });
  }

  private createDefaultEnvironment(): EnvironmentRecord {
    const def = ApartmentBuilder.createDefaultApartment();
    return {
      id: 'apartment-default',
      name: 'Default Apartment',
      kind: 'procedural',
      source: 'bundled',
      proceduralDefId: 'apartment-default',
      meta: {
        roomCount: 3,
        areaM2: 40.32,
      },
      capabilities: {
        walkable: true,
        hasCollision: true,
        markerCount: 5,
        lodVariants: ['full', 'low'],
      },
      markers: def.markers,
      added: Date.now(),
    };
  }

  getEnvironments(): Observable<EnvironmentRecord[]> {
    return this.environments$.asObservable();
  }

  async getEnvironment(id: string): Promise<EnvironmentRecord | null> {
    const envs = this.environments$.getValue();
    return envs.find((e) => e.id === id) || null;
  }

  async addEnvironment(record: EnvironmentRecord): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(record);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.loadEnvironments();
        resolve();
      };
    });
  }

  async updateEnvironment(record: EnvironmentRecord): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.loadEnvironments();
        resolve();
      };
    });
  }

  async deleteEnvironment(id: string): Promise<void> {
    if (!this.db || id === 'apartment-default') return; // don't delete default

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.loadEnvironments();
        resolve();
      };
    });
  }

  async importEnvironment(file: File): Promise<EnvironmentRecord> {
    // Simplified import: expects .vmenv (zip) or .glb
    // For now, just create a record

    const id = `env-${Date.now()}`;
    const blob = new Blob([file], { type: file.type });

    // Store blob in IDB
    if (!this.db) throw new Error('DB not initialized');

    const blobKey = `blob-${id}`;
    const blobTx = this.db!.transaction([BLOB_STORE_NAME], 'readwrite');
    const blobStore = blobTx.objectStore(BLOB_STORE_NAME);
    await new Promise((resolve, reject) => {
      const req = blobStore.put(blob, blobKey);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(null);
    });

    const record: EnvironmentRecord = {
      id,
      name: file.name.replace(/\.[^/.]+$/, ''),
      kind: 'glb',
      source: 'imported',
      blobKey,
      meta: {
        roomCount: 1,
        areaM2: 0,
      },
      capabilities: {
        walkable: true,
        hasCollision: true,
        markerCount: 0,
        lodVariants: ['full'],
      },
      markers: [],
      added: Date.now(),
    };

    await this.addEnvironment(record);
    return record;
  }

  async exportEnvironment(id: string): Promise<Blob> {
    const record = await this.getEnvironment(id);
    if (!record || !record.blobKey) throw new Error('Environment not found');

    if (!this.db) throw new Error('DB not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([BLOB_STORE_NAME], 'readonly');
      const store = tx.objectStore(BLOB_STORE_NAME);
      const req = store.get(record.blobKey!);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const blob = req.result as Blob;
        resolve(blob);
      };
    });
  }

  getProcedureDefinition(defId: string): ApartmentDef | null {
    if (defId === 'apartment-default') {
      return ApartmentBuilder.createDefaultApartment();
    }
    return null;
  }

  dispose(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// Validator
// ─────────────────────────────────────────────────────────────────

export async function validateEnvironmentFile(
  file: File
): Promise<{
  valid: boolean;
  errors: string[];
  polyCount?: number;
  tierFit?: string;
}> {
  const errors: string[] = [];

  // Size check
  if (file.size > 150 * 1024 * 1024) {
    errors.push('File exceeds 150 MB limit');
    return { valid: false, errors };
  }

  // For now, basic checks; full GLB parsing would happen here
  if (!file.type.includes('gltf') && !file.type.includes('glb') && !file.name.endsWith('.vmenv')) {
    errors.push('File must be .glb, .gltf, or .vmenv');
  }

  return {
    valid: errors.length === 0,
    errors,
    polyCount: 0,
    tierFit: 'Low, Medium, High',
  };
}
