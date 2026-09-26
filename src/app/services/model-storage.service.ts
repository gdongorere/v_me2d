import { Injectable } from '@angular/core';

export interface StoredModel {
  id: string;
  name: string;
  buffer: ArrayBuffer;
  dateAdded: number;
}

@Injectable({
  providedIn: 'root'
})
export class ModelStorageService {
  private dbName = 'vtuber_models';
  private storeName = 'models';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const target = event.target as IDBOpenDBRequest;
        this.db = target.result;
        if (!this.db!.objectStoreNames.contains(this.storeName)) {
          this.db!.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    });
  }

  async saveModel(file: File): Promise<Omit<StoredModel, 'buffer'>> {
    await this.init();
    const buffer = await file.arrayBuffer();
    const model: StoredModel = {
      id: Date.now().toString(),
      name: file.name,
      buffer,
      dateAdded: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(model);
      request.onsuccess = () => resolve({
        id: model.id,
        name: model.name,
        dateAdded: model.dateAdded
      });
      request.onerror = () => reject(request.error);
    });
  }

  async getModels(): Promise<Omit<StoredModel, 'buffer'>[]> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => {
        const models = request.result.map(m => ({
          id: m.id,
          name: m.name,
          dateAdded: m.dateAdded
        }));
        resolve(models.sort((a, b) => b.dateAdded - a.dateAdded));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getModelBuffer(id: string): Promise<ArrayBuffer> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result.buffer);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteModel(id: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateModelName(id: string, newName: string): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);
      request.onsuccess = () => {
        const model = request.result;
        model.name = newName;
        store.put(model).onsuccess = () => resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}
