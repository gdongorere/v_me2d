/**
 * V-Me 2D Character Storage Service
 * Manages character persistence, import/export, and syncing
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Character2D, StoredCharacter2D, CharacterExport, createDefaultCharacter } from '../models/character-2d.models';

@Injectable({
  providedIn: 'root',
})
export class Character2DStorageService {
  private dbName = 'v_me_2d_characters';
  private storeName = 'characters';
  private db: IDBDatabase | null = null;

  private charactersSubject = new BehaviorSubject<Character2D[]>([]);
  public characters$ = this.charactersSubject.asObservable();

  private currentCharacterSubject = new BehaviorSubject<Character2D | null>(null);
  public currentCharacter$ = this.currentCharacterSubject.asObservable();

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        this.loadAllCharacters().then(resolve);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const target = event.target as IDBOpenDBRequest;
        this.db = target.result;

        if (!this.db!.objectStoreNames.contains(this.storeName)) {
          const store = this.db!.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('modified', 'modified', { unique: false });
          store.createIndex('created', 'created', { unique: false });
          store.createIndex('tags', 'tags', { multiEntry: true });
        }
      };
    });
  }

  /**
   * Save or update a character
   */
  async saveCharacter(character: Character2D): Promise<void> {
    await this.init();

    character.modified = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(character);

      request.onsuccess = () => {
        this.loadAllCharacters().then(resolve);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all stored characters
   */
  async getCharacters(): Promise<Character2D[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('modified');
      const request = index.getAll();

      request.onsuccess = () => {
        const characters = (request.result as Character2D[]).reverse(); // Most recent first
        resolve(characters);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get character by ID
   */
  async getCharacter(id: string): Promise<Character2D | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a character
   */
  async deleteCharacter(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.loadAllCharacters().then(resolve);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update character name
   */
  async renameCharacter(id: string, newName: string): Promise<void> {
    const character = await this.getCharacter(id);
    if (character) {
      character.name = newName;
      character.modified = Date.now();
      await this.saveCharacter(character);
    }
  }

  /**
   * Search characters by tags
   */
  async searchByTags(tags: string[]): Promise<Character2D[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('tags');

      const results: Character2D[] = [];
      let processed = 0;

      tags.forEach((tag) => {
        const request = index.getAll(tag);
        request.onsuccess = () => {
          results.push(...(request.result as Character2D[]));
          processed++;
          if (processed === tags.length) {
            // Remove duplicates
            const unique = Array.from(new Map(results.map((c) => [c.id, c])).values());
            resolve(unique);
          }
        };
        request.onerror = () => reject(request.error);
      });

      if (tags.length === 0) resolve([]);
    });
  }

  /**
   * Add tag to character
   */
  async addTag(id: string, tag: string): Promise<void> {
    const character = await this.getCharacter(id);
    if (character && !character.tags.includes(tag)) {
      character.tags.push(tag);
      character.modified = Date.now();
      await this.saveCharacter(character);
    }
  }

  /**
   * Remove tag from character
   */
  async removeTag(id: string, tag: string): Promise<void> {
    const character = await this.getCharacter(id);
    if (character) {
      character.tags = character.tags.filter((t) => t !== tag);
      character.modified = Date.now();
      await this.saveCharacter(character);
    }
  }

  /**
   * Export character as JSON
   */
  async exportCharacter(id: string): Promise<Blob> {
    const character = await this.getCharacter(id);
    if (!character) throw new Error('Character not found');

    const exportData: CharacterExport = {
      version: 1,
      character,
      exportedAt: Date.now(),
      exportedBy: 'V-Me Character Creator',
      hash: this.generateHash(character),
    };

    const json = JSON.stringify(exportData, null, 2);
    return new Blob([json], { type: 'application/json' });
  }

  /**
   * Import character from JSON file
   */
  async importCharacter(file: File): Promise<Character2D> {
    const text = await file.text();
    const data: CharacterExport = JSON.parse(text);

    if (data.version !== 1) {
      throw new Error(`Unsupported character version: ${data.version}`);
    }

    // Validate hash
    const expectedHash = this.generateHash(data.character);
    if (data.hash && data.hash !== expectedHash) {
      console.warn('Character file may be corrupted (hash mismatch)');
    }

    // Generate new ID for imported character
    const character = data.character;
    character.id = Math.random().toString(36).substr(2, 9);
    character.created = Date.now();
    character.modified = Date.now();

    await this.saveCharacter(character);
    return character;
  }

  /**
   * Export all characters as ZIP
   */
  async exportAllCharacters(): Promise<Blob> {
    const characters = await this.getCharacters();
    const exports = await Promise.all(characters.map((c) => this.exportCharacter(c.id)));

    // Create a simple text file with all exports
    const combined = exports.map((blob) => blob.text());
    const texts = await Promise.all(combined);
    const content = texts.join('\n---\n');

    return new Blob([content], { type: 'text/plain' });
  }

  /**
   * Create a backup (IndexedDB snapshot)
   */
  async createBackup(): Promise<string> {
    const characters = await this.getCharacters();
    const backup = {
      version: 1,
      timestamp: Date.now(),
      characters,
    };
    return JSON.stringify(backup);
  }

  /**
   * Restore from backup
   */
  async restoreBackup(backupJSON: string): Promise<number> {
    const backup = JSON.parse(backupJSON);

    if (backup.version !== 1) {
      throw new Error(`Unsupported backup version: ${backup.version}`);
    }

    let imported = 0;
    for (const character of backup.characters) {
      // Don't overwrite existing characters - import with new ID
      character.id = Math.random().toString(36).substr(2, 9);
      character.created = Date.now();
      character.modified = Date.now();
      await this.saveCharacter(character);
      imported++;
    }

    return imported;
  }

  /**
   * Set current character for editing
   */
  setCurrentCharacter(character: Character2D | null): void {
    this.currentCharacterSubject.next(character);
  }

  /**
   * Get current character
   */
  getCurrentCharacter(): Character2D | null {
    return this.currentCharacterSubject.value;
  }

  /**
   * Create a new character with default values
   */
  createNewCharacter(): Character2D {
    return createDefaultCharacter();
  }

  /**
   * Duplicate a character
   */
  async duplicateCharacter(id: string): Promise<Character2D> {
    const original = await this.getCharacter(id);
    if (!original) throw new Error('Character not found');

    const duplicate: Character2D = {
      ...JSON.parse(JSON.stringify(original)), // Deep copy
      id: Math.random().toString(36).substr(2, 9),
      name: `${original.name} (Copy)`,
      created: Date.now(),
      modified: Date.now(),
    };

    await this.saveCharacter(duplicate);
    return duplicate;
  }

  /**
   * Merge characters (combine features from two characters)
   */
  async mergeCharacters(id1: string, id2: string, characterName: string): Promise<Character2D> {
    const char1 = await this.getCharacter(id1);
    const char2 = await this.getCharacter(id2);

    if (!char1 || !char2) throw new Error('One or both characters not found');

    const merged: Character2D = {
      ...char1,
      id: Math.random().toString(36).substr(2, 9),
      name: characterName,
      features: {
        ...char1.features,
        // Take select features from char2
        hair: char2.hair,
        eyes: char2.features.eyes,
      },
      created: Date.now(),
      modified: Date.now(),
    };

    await this.saveCharacter(merged);
    return merged;
  }

  /**
   * Get storage stats
   */
  async getStorageStats(): Promise<{
    totalCharacters: number;
    storageUsed: string; // Approximate
  }> {
    const characters = await this.getCharacters();
    const estimatedSize = JSON.stringify(characters).length;
    const sizeInKB = (estimatedSize / 1024).toFixed(2);

    return {
      totalCharacters: characters.length,
      storageUsed: `${sizeInKB} KB`,
    };
  }

  /**
   * Clear all data (use with caution!)
   */
  async clearAllData(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        this.charactersSubject.next([]);
        this.currentCharacterSubject.next(null);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load all characters and update subject
   */
  private async loadAllCharacters(): Promise<void> {
    const characters = await this.getCharacters();
    this.charactersSubject.next(characters);
  }

  /**
   * Generate simple hash for character
   */
  private generateHash(character: Character2D): string {
    const str = JSON.stringify(character);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Dispose service
   */
  dispose(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
