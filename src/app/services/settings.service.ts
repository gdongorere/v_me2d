import { Injectable, signal } from '@angular/core';

export interface AppSettings {
  enableMicrophone: boolean;
  mirrorCamera: boolean;
  showCameraFeed: boolean;
  showFacePoints: boolean;
  transparentBackground: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  enableMicrophone: false,
  mirrorCamera: false,
  showCameraFeed: false,
  showFacePoints: false,
  transparentBackground: false
};

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly STORAGE_KEY = 'ai_avatar_settings';
  
  settings = signal<AppSettings>(this.loadSettings());

  private loadSettings(): AppSettings {
    if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_SETTINGS;
  }

  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    this.settings.update(s => {
      const newSettings = { ...s, [key]: value };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newSettings));
      }
      return newSettings;
    });
  }
}
