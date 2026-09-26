/**
 * V-Me Character Library Component (standalone)
 * Browse, select, edit, duplicate, delete, export, and import saved
 * 2D characters. Selecting a character emits it so the parent (AppComponent)
 * can set it as the active/worn character.
 */

import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Character2D } from '../models/character-2d.models';
import { Character2DStorageService } from '../services/character-2d-storage.service';
import { Character2DRendererService } from '../services/character-2d-renderer.service';

@Component({
  selector: 'app-character-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
      <div class="flex justify-between items-center p-4 border-b border-white/10">
        <h2 class="text-white text-lg font-semibold">My Characters ({{ characters.length }})</h2>
        <div class="flex gap-2">
          <label class="btn-secondary cursor-pointer">
            Import
            <input type="file" accept="application/json" (change)="onImportFile($event)" class="hidden" />
          </label>
          <button (click)="createNew()" class="btn-primary">+ New Character</button>
          <button (click)="close.emit()" class="btn-secondary">✕</button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <div *ngIf="characters.length === 0" class="text-white/50 text-center py-20">
          No characters yet. Click "New Character" to create your first one.
        </div>

        <div class="grid grid-cols-4 gap-4">
          <div *ngFor="let c of characters" class="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-indigo-500 transition">
            <div class="aspect-square bg-gradient-to-br from-indigo-900/40 to-purple-900/40 flex items-center justify-center">
              <img *ngIf="thumbnails[c.id]" [src]="thumbnails[c.id]" class="w-full h-full object-cover" />
            </div>
            <div class="p-2">
              <div class="text-white text-sm font-medium truncate">{{ c.name }}</div>
              <div class="text-white/40 text-xs">{{ c.modified | date:'shortDate' }}</div>
              <div class="flex gap-1 mt-2 flex-wrap">
                <button (click)="select.emit(c)" class="mini-btn bg-indigo-600">Wear</button>
                <button (click)="editRequested.emit(c)" class="mini-btn bg-white/10">Edit</button>
                <button (click)="duplicate(c)" class="mini-btn bg-white/10">Copy</button>
                <button (click)="exportCharacter(c)" class="mini-btn bg-white/10">Export</button>
                <button (click)="remove(c)" class="mini-btn bg-red-600/60">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="p-3 border-t border-white/10 text-white/40 text-xs flex justify-between">
        <span>{{ storageStats }}</span>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .btn-primary { background:#6366f1; color:white; padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; }
    .btn-secondary { background:rgba(255,255,255,0.08); color:white; padding:8px 14px; border-radius:8px; font-size:13px; }
    .mini-btn { color:white; font-size:11px; padding:4px 8px; border-radius:6px; }
  `],
})
export class CharacterLibraryComponent implements OnInit {
  @Output() select = new EventEmitter<Character2D>();
  @Output() editRequested = new EventEmitter<Character2D>();
  @Output() createRequested = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  characters: Character2D[] = [];
  thumbnails: Record<string, string> = {};
  storageStats = '';

  constructor(
    private storage: Character2DStorageService,
    private renderer: Character2DRendererService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.characters = await this.storage.getCharacters();
    for (const c of this.characters) {
      this.thumbnails[c.id] = this.renderer.generateThumbnail(c);
    }
    const stats = await this.storage.getStorageStats();
    this.storageStats = `${stats.totalCharacters} characters · ${stats.storageUsed}`;
  }

  createNew(): void {
    this.createRequested.emit();
  }

  async duplicate(c: Character2D): Promise<void> {
    await this.storage.duplicateCharacter(c.id);
    await this.refresh();
  }

  async remove(c: Character2D): Promise<void> {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    await this.storage.deleteCharacter(c.id);
    await this.refresh();
  }

  async exportCharacter(c: Character2D): Promise<void> {
    const blob = await this.storage.exportCharacter(c.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${c.name.replace(/[^a-z0-9]+/gi, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async onImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await this.storage.importCharacter(file);
      await this.refresh();
    } catch (e) {
      alert('Could not import that file — it may not be a valid V-Me character export.');
    } finally {
      input.value = '';
    }
  }
}
