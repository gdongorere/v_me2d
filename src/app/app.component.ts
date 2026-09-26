import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { ThreeSceneService } from './services/three-scene.service';
import { FaceTrackingService } from './services/face-tracking.service';
import { ModelStorageService, StoredModel } from './services/model-storage.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';
import * as Kalidokit from 'kalidokit';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { Character2D } from './character-2d/models/character-2d.models';
import { PoseBridgeService } from './character-2d/services/pose-bridge.service';
import { Character2DStorageService } from './character-2d/services/character-2d-storage.service';
import { Character2DDisplayComponent } from './character-2d/components/character-2d-display.component';
import { CharacterCreatorComponent } from './character-2d/components/character-creator.component';
import { CharacterLibraryComponent } from './character-2d/components/character-library.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, Character2DDisplayComponent, CharacterCreatorComponent, CharacterLibraryComponent],
  template: `
    <div class="relative w-full h-screen bg-neutral-900 overflow-hidden flex" #container>
      
      <!-- Video Feed -->
      <video #videoElement
             [class.opacity-0]="!showCameraView"
             class="absolute bottom-4 right-4 w-48 rounded-xl shadow-xl border border-white/10 z-20 object-cover"
             [class.-scale-x-100]="isMirrored"
             autoplay playsinline></video>

      <!-- 2D Character System overlay -->
      <div *ngIf="show2DCharacter && activeCharacter2D"
           class="absolute inset-0 z-10 bg-gradient-to-br from-indigo-950 to-purple-950">
        <app-character-2d-display [character]="activeCharacter2D" [livePose]="true" class="w-full h-full"></app-character-2d-display>
      </div>

      <!-- 2D system floating toolbar (always available, independent of 3D layout) -->
      <div class="fixed top-4 left-4 z-30 flex gap-2">
        <button (click)="toggle2DMode()"
                class="bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-3 py-2 rounded-lg border border-white/10 backdrop-blur">
          {{ show2DCharacter ? '3D Mode' : '2D Mode' }}
        </button>
        <button *ngIf="show2DCharacter" (click)="openCharacterCreator()"
                class="bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-medium px-3 py-2 rounded-lg backdrop-blur">
          Create Character
        </button>
        <button *ngIf="show2DCharacter" (click)="openCharacterLibrary()"
                class="bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-3 py-2 rounded-lg border border-white/10 backdrop-blur">
          My Characters
        </button>
      </div>

      <app-character-creator
        *ngIf="showCharacterCreator"
        [editingCharacter]="editingCharacter2D"
        (saved)="onCharacterSaved($event)"
        (cancelled)="onCharacterCreatorCancelled()">
      </app-character-creator>

      <app-character-library
        *ngIf="showCharacterLibrary"
        (select)="onCharacterSelectedFromLibrary($event)"
        (editRequested)="openCharacterCreator($event)"
        (createRequested)="openCharacterCreator()"
        (close)="showCharacterLibrary = false">
      </app-character-library>

      <!-- Main Canvas for 3D Scene -->
      <div class="flex-1 relative" [class.fixed]="isFullscreen" [class.inset-0]="isFullscreen" [class.z-50]="isFullscreen">
         <canvas #canvasElement class="w-full h-full block touch-none"></canvas>

         <!-- Loading Overlay -->
         <div *ngIf="isLoadingAvatar" class="absolute inset-0 bg-neutral-900/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center text-white transition-opacity duration-300">
            <div class="relative flex items-center justify-center w-32 h-32 mb-8">
               <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
               <div class="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
               <div class="absolute inset-2 rounded-full border-4 border-emerald-500/20"></div>
               <div class="absolute inset-2 rounded-full border-4 border-emerald-500 border-b-transparent animate-[spin_1.5s_linear_reverse_infinite]"></div>
               <div class="absolute inset-4 rounded-full border-4 border-fuchsia-500/20"></div>
               <div class="absolute inset-4 rounded-full border-4 border-fuchsia-500 border-l-transparent animate-[spin_2s_linear_infinite]"></div>
               <svg class="w-8 h-8 text-white absolute animate-pulse" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h2 class="text-2xl font-bold mb-2 tracking-tight bg-gradient-to-r from-indigo-400 via-emerald-400 to-fuchsia-400 bg-clip-text text-transparent animate-pulse">Summoning Avatar...</h2>
            <p class="text-sm text-neutral-400 mt-2 max-w-sm">Loading 3D model, optimizing meshes, and calibrating facial trackers.</p>
         </div>

         <!-- Camera Error Overlay -->
         <div *ngIf="cameraError" class="absolute inset-0 bg-neutral-900/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6 text-center text-white">
            <svg class="w-16 h-16 text-red-500 mb-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="4"/></svg>
            <h2 class="text-xl font-bold mb-2">Camera Access Required</h2>
            <p class="text-neutral-300 max-w-md">{{ cameraError }}</p>
            <p class="text-sm text-neutral-400 mt-4">Please allow camera access in your browser settings to use Virtual Me.</p>
         </div>

         <!-- App Update Banner -->
         <div *ngIf="hasUpdate" class="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-indigo-600/90 backdrop-blur-md border border-indigo-400/30 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-bounce">
            <div class="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span class="text-sm font-medium">New version available!</span>
            </div>
            <button (click)="installUpdate()" [disabled]="isUpdating" class="bg-white text-indigo-700 hover:bg-neutral-100 disabled:opacity-50 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
              {{ isUpdating ? 'Updating...' : 'Update Now' }}
            </button>
         </div>

         <!-- Atmosphere Controls overlay -->
         <div class="absolute top-6 bottom-6 left-6 p-4 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md shadow-lg w-72 max-h-[calc(100vh-3rem)] overflow-y-auto text-white z-10 transition-opacity" *ngIf="showControls">
             <h3 class="text-sm font-semibold mb-3 tracking-tight">Virtual Me Settings</h3>
             
             <div class="mb-5">
               <label class="text-xs text-neutral-400 mb-2 block">Upload Avatar (.vrm, .glb)</label>
               <input type="file" accept=".vrm,.glb" (change)="onFileSelected($event)" class="w-full text-xs text-neutral-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500">
             </div>

             <div class="mb-5" *ngIf="bundledModels.length > 0">
               <label class="text-xs text-neutral-400 mb-2 block">Built-in Avatars</label>
               <div class="flex flex-col gap-2 max-h-32 overflow-y-auto pr-2">
                 <div *ngFor="let model of bundledModels" class="flex justify-between items-center bg-neutral-800 p-2 rounded border border-white/10 group cursor-pointer hover:bg-neutral-700" (click)="loadBundledModel(model.url)">
                   <div class="text-xs text-neutral-300 group-hover:text-white truncate flex-1">{{ model.name }}</div>
                 </div>
               </div>
             </div>

             <div class="mb-5" *ngIf="savedModels.length > 0">
               <label class="text-xs text-neutral-400 mb-2 block">Saved Avatars</label>
               <div class="flex flex-col gap-2 max-h-32 overflow-y-auto pr-2">
                 <div *ngFor="let model of savedModels" class="flex justify-between items-center bg-neutral-800 p-2 rounded border border-white/10 group cursor-pointer hover:bg-neutral-700" (click)="loadSavedModel(model.id)">
                   <div class="text-xs text-neutral-300 group-hover:text-white truncate flex-1">{{ model.name }}</div>
                   <button (click)="deleteModel(model.id, $event)" class="text-neutral-500 hover:text-red-400 p-1 ml-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                   </button>
                 </div>
               </div>
             </div>

             <div class="mb-3">
               <label class="text-xs text-neutral-400 mb-1 block">Ambient Light</label>
               <input type="range" min="0" max="2" step="0.1" [(ngModel)]="hemiIntensity" (ngModelChange)="updateAtmosphere()" class="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer">
             </div>
             
             <div class="mb-3">
               <label class="text-xs text-neutral-400 mb-1 block">Directional Light</label>
               <input type="range" min="0" max="3" step="0.1" [(ngModel)]="dirIntensity" (ngModelChange)="updateAtmosphere()" class="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer">
             </div>

             <div class="mb-3">
               <label class="text-xs text-neutral-400 mb-1 block">Exposure</label>
               <input type="range" min="0" max="3" step="0.1" [(ngModel)]="exposure" (ngModelChange)="updateAtmosphere()" class="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer">
             </div>

             <div class="mb-4 border-t border-white/10 pt-4">
               <h3 class="text-sm font-semibold mb-3 tracking-tight">Voice Disguise</h3>
               <div class="flex flex-col gap-2">
                 <label class="text-xs text-neutral-400 flex justify-between">
                   <span>Pitch Mod (Alien Voice)</span>
                   <span>{{ voiceModFreq }} Hz</span>
                 </label>
                 <input type="range" min="0" max="1000" step="10" [(ngModel)]="voiceModFreq" (ngModelChange)="onVoiceModChange()" class="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer">
               </div>
             </div>

             <div class="mb-4 border-t border-white/10 pt-4">
               <h3 class="text-sm font-semibold mb-3 tracking-tight">Avatar Effects</h3>
               <label class="flex items-center gap-2 cursor-pointer">
                 <input type="checkbox" [(ngModel)]="whiteEyes" (ngModelChange)="onWhiteEyesChange()" class="rounded bg-neutral-700 border-transparent focus:ring-indigo-500 text-indigo-600">
                 <span class="text-xs font-medium">White Eyes (Rotate 180 on Z)</span>
               </label>
             </div>

             <div class="mb-4 border-t border-white/10 pt-4">
               <h3 class="text-sm font-semibold mb-3 tracking-tight">Expressions (Keys 1-5)</h3>
               <div class="grid grid-cols-2 gap-2">
                 <button *ngFor="let expr of expressions; let i = index" 
                         (click)="toggleExpression(expr.name)"
                         [class.bg-indigo-600]="expr.active"
                         [class.bg-neutral-700]="!expr.active"
                         class="py-1.5 px-2 rounded text-xs font-medium transition-colors text-left flex justify-between items-center">
                   <span>{{ expr.label }}</span>
                   <span class="text-neutral-400 text-[10px]">{{ i + 1 }}</span>
                 </button>
               </div>
             </div>

             <div class="mb-4 border-t border-white/10 pt-4">
               <h3 class="text-sm font-semibold mb-3 tracking-tight">Camera & Lighting Presets</h3>
               <div class="mb-3">
                 <label class="text-xs text-neutral-400 mb-1 block">Camera Angle</label>
                 <select [(ngModel)]="cameraPreset" (change)="onCameraPresetChange()" class="w-full bg-neutral-700 text-xs text-white rounded p-1.5 border border-white/10 focus:outline-none focus:border-indigo-500">
                   <option value="closeup">Close-up (Face)</option>
                   <option value="halfbody">Half Body</option>
                   <option value="fullbody">Full Body</option>
                 </select>
               </div>
               <div class="mb-3">
                 <label class="text-xs text-neutral-400 mb-1 block">Lighting Mood</label>
                 <select [(ngModel)]="lightingPreset" (change)="onLightingPresetChange()" class="w-full bg-neutral-700 text-xs text-white rounded p-1.5 border border-white/10 focus:outline-none focus:border-indigo-500">
                   <option value="studioSoft">Studio Soft</option>
                   <option value="neonCyberpunk">Neon Cyberpunk</option>
                   <option value="dramaticWarm">Dramatic Warm</option>
                 </select>
               </div>
             </div>

             <div class="mb-4 border-t border-white/10 pt-4">
               <h3 class="text-sm font-semibold mb-3 tracking-tight">Props</h3>
               <div class="flex items-center justify-between mb-2">
                 <span class="text-xs text-neutral-300">Sunglasses</span>
                 <button (click)="toggleSunglasses()" [class.bg-emerald-500]="hasSunglasses" [class.bg-neutral-600]="!hasSunglasses" class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none">
                   <span aria-hidden="true" [class.translate-x-4]="hasSunglasses" [class.translate-x-0]="!hasSunglasses" class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                 </button>
               </div>
             </div>

             <div class="mt-4 pt-4 border-t border-white/10">
               <h3 class="text-sm font-semibold mb-3 tracking-tight">Camera & Recording</h3>

               <div class="flex gap-2 mb-4">
                 <button (click)="toggleCameraState()" 
                         [class.bg-emerald-500]="isCameraEnabled" [class.bg-red-500]="!isCameraEnabled"
                         class="flex-1 py-1.5 flex justify-center items-center rounded text-white transition-colors" title="Toggle Camera">
                   <svg *ngIf="isCameraEnabled" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                   <svg *ngIf="!isCameraEnabled" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 15v-6a2 2 0 0 0-2-2h-3l-2.5-3h-3L8 5.5"/><circle cx="12" cy="13" r="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 7H2v10a2 2 0 0 0 2 2h14"/></svg>
                 </button>
                 <button (click)="toggleMicrophoneState()"
                         [class.bg-emerald-500]="isMicrophoneEnabled" [class.bg-red-500]="!isMicrophoneEnabled"
                         class="flex-1 py-1.5 flex justify-center items-center rounded text-white transition-colors" title="Toggle Microphone">
                   <svg *ngIf="isMicrophoneEnabled" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                   <svg *ngIf="!isMicrophoneEnabled" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                 </button>
               </div>
               
               <!--
               <div class="mb-3">
                 <label class="text-xs text-neutral-400 mb-1 flex justify-between">
                   <span>Movement Smoothing</span>
                   <span>{{ smoothing | number:'1.1-1' }}</span>
                 </label>
                 <input type="range" min="1" max="20" step="0.5" [(ngModel)]="smoothing" class="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer">
               </div>
               -->

               <div class="flex items-center justify-between mb-3">
                 <label class="text-xs text-neutral-400">Show Camera PiP</label>
                 <button (click)="toggleCameraView()" [class.bg-emerald-500]="showCameraView" [class.bg-neutral-600]="!showCameraView" class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none">
                   <span aria-hidden="true" [class.translate-x-4]="showCameraView" [class.translate-x-0]="!showCameraView" class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                 </button>
               </div>

               <div class="mb-3">
                 <label class="text-xs text-neutral-400 mb-1 block">Background</label>
                 <select [(ngModel)]="backgroundType" (change)="onBackgroundChange()" class="w-full bg-neutral-700 text-xs text-white rounded p-1.5 border border-white/10 focus:outline-none focus:border-indigo-500">
                   <option *ngFor="let bg of backgrounds" [value]="bg.id">{{ bg.name }}</option>
                 </select>
               </div>
               
               <div class="flex items-center justify-between mb-3">
                 <label class="text-xs text-neutral-400">Mirror Avatar</label>
                 <button (click)="toggleMirror()" [class.bg-emerald-500]="isMirrored" [class.bg-neutral-600]="!isMirrored" class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none">
                   <span aria-hidden="true" [class.translate-x-4]="isMirrored" [class.translate-x-0]="!isMirrored" class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                 </button>
               </div>

               <div class="flex items-center justify-between mb-4">
                 <label class="text-xs text-neutral-400">Selfie Mode</label>
                 <button (click)="toggleSelfieMode()" [class.bg-emerald-500]="selfieMode" [class.bg-neutral-600]="!selfieMode" class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none">
                   <span aria-hidden="true" [class.translate-x-4]="selfieMode" [class.translate-x-0]="!selfieMode" class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                 </button>
               </div>

               <button (click)="calibrateFace()" 
                       [class.bg-white]="calibrationFlash"
                       [class.text-black]="calibrationFlash"
                       [class.bg-neutral-700]="!calibrationFlash"
                       [class.hover:bg-neutral-600]="!calibrationFlash"
                       class="w-full py-2 mb-2 flex items-center justify-center gap-2 rounded text-sm font-medium transition-colors duration-100">
                 Calibrate
               </button>

               <button (click)="toggleRecording()" 
                       [class.bg-red-600]="isRecording"
                       [class.hover:bg-red-500]="isRecording"
                       [class.bg-neutral-700]="!isRecording"
                       [class.hover:bg-neutral-600]="!isRecording"
                       class="w-full py-2 flex items-center justify-center gap-2 rounded text-sm font-medium transition-colors">
                 <span *ngIf="isRecording" class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                 {{ isRecording ? 'Stop Recording' : 'Start Recording' }}
               </button>
             </div>

             <button (click)="showPerformanceMenu = true" class="mt-2 w-full py-2 bg-neutral-700 hover:bg-neutral-600 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
               Performance Boosters
             </button>

             <button (click)="toggleFullscreen()" class="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium transition-colors">
               {{ isFullscreen ? 'Exit Full Screen' : 'Go Full Screen' }}
             </button>

             <button *ngIf="deferredInstallPrompt" (click)="installApp()" class="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
               Install App
             </button>
         </div>

         <!-- Toggle Controls Button -->
         <button (click)="showControls = !showControls" class="absolute bottom-6 right-6 p-3 bg-neutral-800/80 hover:bg-neutral-700/80 text-white rounded-full z-[100] backdrop-blur-sm transition-colors border border-white/10 shadow-lg">
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
         </button>

         <!-- Performance Stats Overlay -->
         <div class="absolute top-4 left-4 p-2 bg-black/60 rounded-lg text-white font-mono text-xs z-10 pointer-events-none backdrop-blur-sm border border-white/10">
           <div class="flex flex-col gap-1">
             <div class="flex justify-between gap-4">
               <span class="text-neutral-400">FPS:</span>
               <span [class.text-red-400]="(fps$ | async) !== null && (fps$ | async)! < 25" [class.text-emerald-400]="(fps$ | async) !== null && (fps$ | async)! >= 25">{{ fps$ | async }}</span>
             </div>
             <div class="flex justify-between gap-4">
               <span class="text-neutral-400">MEM:</span>
               <span>{{ memoryUsage$ | async }} MB</span>
             </div>
           </div>
         </div>
      </div>

      <!-- Actions Bottom Navigation -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 z-[5] flex flex-col items-center justify-center gap-2 bg-neutral-900/80 backdrop-blur-md px-6 py-3 rounded-3xl border border-white/10 shadow-2xl">
        <div class="flex items-center justify-center gap-4">
          <button *ngFor="let expr of expressions" 
                  (click)="toggleExpression(expr.name)"
                  [class.scale-125]="expr.active"
                  [class.bg-indigo-600]="expr.active"
                  [class.bg-neutral-800]="!expr.active"
                  class="w-12 h-12 flex items-center justify-center rounded-full text-2xl transition-all duration-300 hover:scale-110 shadow-lg border border-white/5">
            {{ expr.emoji }}
          </button>
        </div>
        <div class="flex items-center justify-center gap-4 w-full pt-1">
          <button *ngFor="let gesture of gestures"
                  (click)="playGesture(gesture.name)"
                  class="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-800 text-lg transition-all duration-300 hover:scale-110 hover:bg-neutral-700 shadow-md border border-white/5">
            {{ gesture.emoji }}
          </button>
        </div>
      </div>

          <!-- Performance Menu Modal -->
          <div *ngIf="showPerformanceMenu" class="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div class="bg-neutral-800 border border-white/10 rounded-xl shadow-2xl p-6 w-full max-w-sm text-white">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold">Performance Boosters</h2>
                <button (click)="showPerformanceMenu = false" class="text-neutral-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <p class="text-xs text-neutral-400 mb-4">
                Adjust these settings to improve performance. The app will reload when you apply changes.
              </p>

              <div class="space-y-4">
                <div>
                  <label class="text-xs text-neutral-400 mb-1 block">Input Resolution</label>
                  <select [(ngModel)]="perfRes" class="w-full bg-neutral-700 text-sm text-white rounded p-2 border border-white/10 focus:outline-none">
                    <option value="high">High (640x480) - Best tracking</option>
                    <option value="medium">Medium (320x240) - Balanced</option>
                    <option value="low">Low (160x120) - Best tracking speed</option>
                  </select>
                </div>

                <div>
                  <label class="text-xs text-neutral-400 mb-1 block">Pixel Ratio</label>
                  <select [(ngModel)]="perfPixelRatio" class="w-full bg-neutral-700 text-sm text-white rounded p-2 border border-white/10 focus:outline-none">
                    <option value="native">Native (Sharpest)</option>
                    <option value="1">1.0x (Balanced)</option>
                    <option value="0.5">0.5x (Fastest, Pixelated)</option>
                  </select>
                </div>

                <div class="flex items-center justify-between">
                  <label class="text-sm text-neutral-300">Disable Shadows</label>
                  <button (click)="perfDisableShadows = !perfDisableShadows" [class.bg-emerald-500]="perfDisableShadows" [class.bg-neutral-600]="!perfDisableShadows" class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none">
                    <span aria-hidden="true" [class.translate-x-4]="perfDisableShadows" [class.translate-x-0]="!perfDisableShadows" class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                  </button>
                </div>

                <div class="flex items-center justify-between">
                  <label class="text-sm text-neutral-300">Disable Antialiasing</label>
                  <button (click)="perfDisableAntialiasing = !perfDisableAntialiasing" [class.bg-emerald-500]="perfDisableAntialiasing" [class.bg-neutral-600]="!perfDisableAntialiasing" class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none">
                    <span aria-hidden="true" [class.translate-x-4]="perfDisableAntialiasing" [class.translate-x-0]="!perfDisableAntialiasing" class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                  </button>
                </div>
              </div>

              <div class="mt-6">
                <button (click)="applyPerformanceSettings()" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-medium transition-colors">
                  Apply & Reload
                </button>
              </div>
            </div>
          </div>
       <!-- </div> Removed extra closing div -->

    </div>
  `
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasElement') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('videoElement') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('container') containerRef!: ElementRef<HTMLDivElement>;

  showControls = true;
  showPerformanceMenu = false;
  isLoadingAvatar = false;
  
  isTrackingInitialized = false;

  perfRes = localStorage.getItem('cameraResolution') || 'medium';
  perfPixelRatio = localStorage.getItem('pixelRatio') || 'native';
  perfDisableShadows = localStorage.getItem('disableShadows') === 'true';
  perfDisableAntialiasing = localStorage.getItem('disableAntialiasing') === 'true';

  isFullscreen = false;
  
  hemiIntensity = 1.0;
  dirIntensity = 1.0;
  exposure = 1.0;
  smoothing = 1.0; // Responsive base, adaptive lerp handles fast movements

  backgroundType = 'none';
  backgrounds = [
    { id: 'none', name: 'None (Transparent)' },
    { id: 'greenScreen', name: 'Green Screen' },
    { id: 'streamingRoom', name: 'Streaming Room' },
    { id: 'neonCity', name: 'Neon City' },
    { id: 'nature', name: 'Nature' },
  ];
  isMirrored = true;
  selfieMode = false;
  isRecording = false;
  showCameraView = false;
  isCameraEnabled = true;
  isMicrophoneEnabled = false;
  
  deferredInstallPrompt: any = null;
  cameraError = '';
  private mediaRecorder: any = null;
  private recordedChunks: Blob[] = [];

  hasUpdate = false;
  isUpdating = false;

  // Track smoothed values to apply to threejs VRM independantly at 60fps
  private targetPitch = 0;
  private targetYaw = 0;
  private targetRoll = 0;
  private currentPitch = 0;
  private currentYaw = 0;
  private currentRoll = 0;

  private rawPitch = 0;
  private rawYaw = 0;
  private rawRoll = 0;
  private pitchOffset = 0;
  private yawOffset = 0;
  private rollOffset = 0;

  private targetTx = 0;
  private targetTy = 0;
  private targetTz = 0;
  
  private lastRawPoseResults: any = null;
  private cachedSolvedPose: any = null;
  private lastRawHandResults: any = null;
  private cachedSolvedHands: any = [];
  
  private currentTx = 0;
  private currentTy = 0;
  private currentTz = 0;

  private targetBlendshapes: Record<string, number> = {};
  private currentBlendshapes: Record<string, number> = {};
  private rawBlendshapes: Record<string, number> = {};
  private blendshapeOffsets: Record<string, number> = {};
  
  private targetPoseRotations: Record<string, any> = {};
  private currentPoseRotations: Record<string, any> = {};

  // ── 2D Character System state ──────────────────────────────
  show2DCharacter = false;           // toggles 2D canvas over the 3D scene
  showCharacterCreator = false;
  showCharacterLibrary = false;
  activeCharacter2D: Character2D | null = null;
  editingCharacter2D: Character2D | null = null; // set when opening creator to edit (not create)
  
  private targetFaceData: any = null;
  private currentFaceData: any = { pupil: { x: 0, y: 0 } };
  private lastEyeTrackTime = 0;

  calibrationFlash = false;

  savedModels: Omit<StoredModel, 'buffer'>[] = [];
  bundledModels: { id: string, name: string, url: string }[] = [];

  private handleDeviceOrientation = this.onDeviceOrientation.bind(this);
  private devicePitch = 0;
  private deviceYaw = 0;
  private deviceRoll = 0;

  voiceModFreq = 0;
  whiteEyes = false;
  
  expressions = [
    { name: 'happy', label: 'Joy', emoji: '😄', active: false },
    { name: 'angry', label: 'Angry', emoji: '😠', active: false },
    { name: 'sad', label: 'Sorrow', emoji: '😢', active: false },
    { name: 'relaxed', label: 'Fun', emoji: '😌', active: false },
    { name: 'surprised', label: 'Surprise', emoji: '😲', active: false },
  ];

  gestures = [
    { name: 'wave', label: 'Wave', emoji: '👋' },
    { name: 'nod', label: 'Nod', emoji: '👍' },
    { name: 'shake', label: 'Shake', emoji: '👎' },
    { name: 'bow', label: 'Bow', emoji: '🙇' },
  ];

  playGesture(gesture: string) {
    this.threeService.playGesture(gesture);
  }

  cameraPreset = 'closeup';
  lightingPreset = 'studioSoft';
  hasSunglasses = false;

  fps$!: import('rxjs').Observable<number>;
  memoryUsage$!: import('rxjs').Observable<number>;

  constructor(
    private threeService: ThreeSceneService,
    private faceTracking: FaceTrackingService,
    private modelStorage: ModelStorageService,
    private swUpdate: SwUpdate,
    public perfMonitor: PerformanceMonitorService,
    private ngZone: NgZone,
    private poseBridge: PoseBridgeService,
    private character2DStorage: Character2DStorageService
  ) {
    this.fps$ = this.perfMonitor.fps$;
    this.memoryUsage$ = this.perfMonitor.memoryUsage$;
    
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
        .subscribe(() => {
          this.hasUpdate = true;
        });

      // Periodically check for updates if online (e.g. every 1 hour)
      setInterval(() => {
         if (navigator.onLine) {
             this.swUpdate.checkForUpdate();
         }
      }, 1000 * 60 * 60);
    }
  }

  installUpdate() {
    this.isUpdating = true;
    this.swUpdate.activateUpdate().then(() => {
      document.location.reload();
    });
  }

  async ngOnInit() {
    this.refreshModels();
    this.fetchBundledModels();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
    });

    await this.character2DStorage.init();
    const saved2DCharacters = await this.character2DStorage.getCharacters();
    this.activeCharacter2D = saved2DCharacters.length > 0 ? saved2DCharacters[0] : this.character2DStorage.createNewCharacter();
    if (saved2DCharacters.length === 0) {
      await this.character2DStorage.saveCharacter(this.activeCharacter2D);
    }
  }

  // ── 2D Character System methods ────────────────────────────
  toggle2DMode(): void {
    this.show2DCharacter = !this.show2DCharacter;
  }

  openCharacterCreator(characterToEdit: Character2D | null = null): void {
    this.editingCharacter2D = characterToEdit;
    this.showCharacterCreator = true;
    this.showCharacterLibrary = false;
  }

  openCharacterLibrary(): void {
    this.showCharacterLibrary = true;
    this.showCharacterCreator = false;
  }

  async onCharacterSaved(character: Character2D): Promise<void> {
    await this.character2DStorage.saveCharacter(character);
    this.activeCharacter2D = character;
    this.showCharacterCreator = false;
    this.editingCharacter2D = null;
  }

  onCharacterCreatorCancelled(): void {
    this.showCharacterCreator = false;
    this.editingCharacter2D = null;
  }

  onCharacterSelectedFromLibrary(character: Character2D): void {
    this.activeCharacter2D = character;
    this.showCharacterLibrary = false;
  }

  async fetchBundledModels() {
    try {
      const response = await fetch('avatars/avatars.json');
      if (response.ok) {
        this.bundledModels = await response.json();
      }
    } catch (e) {
      console.log('No bundled avatars found or error fetching them.');
    }
  }

  async loadBundledModel(url: string) {
    this.isLoadingAvatar = true;
    try {
      await this.threeService.loadVRM(url);
      if (!this.isTrackingInitialized) {
        this.startFaceTracking();
        this.isTrackingInitialized = true;
      }
    } catch(e) {
      console.error(e);
    } finally {
      this.isLoadingAvatar = false;
    }
  }

  async refreshModels() {
    try {
      this.savedModels = await this.modelStorage.getModels();
    } catch (e) {
      console.error('Failed to load saved models', e);
    }
  }

  ngAfterViewInit() {
    this.threeService.init(this.canvasRef.nativeElement);
    
    this.startSmoothUpdateLoop();
    this.threeService.setBackground(this.backgroundType);
    this.threeService.setLightingPreset(this.lightingPreset);
    
    document.addEventListener('fullscreenchange', this.onFullscreenChange.bind(this));
    window.addEventListener('deviceorientation', this.handleDeviceOrientation);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const keyMap: { [key: string]: number } = {
      '1': 0, '2': 1, '3': 2, '4': 3, '5': 4
    };
    if (keyMap[event.key] !== undefined) {
      const expr = this.expressions[keyMap[event.key]];
      this.toggleExpression(expr.name);
    }
  }

  toggleExpression(name: string) {
    const expr = this.expressions.find(e => e.name === name);
    if (expr) {
      this.expressions.forEach(e => {
        if (e.name !== name) {
          e.active = false;
          this.threeService.setExpressionTarget(e.name, 0.0);
        }
      });
      expr.active = !expr.active;
      this.threeService.setExpressionTarget(name, expr.active ? 1.0 : 0.0);
      this.threeService.setFloatingEmoji(expr.active ? (expr.emoji || null) : null);
    }
  }

  onVoiceModChange() {
    this.faceTracking.setVoiceModulation(this.voiceModFreq);
  }

  onWhiteEyesChange() {
    this.threeService.whiteEyes = this.whiteEyes;
  }

  onCameraPresetChange() {
    this.threeService.setCameraPreset(this.cameraPreset);
  }

  onLightingPresetChange() {
    this.threeService.setLightingPreset(this.lightingPreset);
  }

  toggleSunglasses() {
    this.hasSunglasses = !this.hasSunglasses;
    this.threeService.toggleProp('sunglasses', this.hasSunglasses);
  }

  ngOnDestroy() {
    this.faceTracking.stopTracking();
    document.removeEventListener('fullscreenchange', this.onFullscreenChange.bind(this));
    window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
  }

  private onDeviceOrientation(event: DeviceOrientationEvent) {
    if (!this.selfieMode) return;
    
    // Convert beta (pitch) and gamma (roll) from device to radians
    // alpha is yaw, but usually we just want the tilt
    if (event.beta !== null && event.gamma !== null) {
       this.devicePitch = THREE.MathUtils.degToRad(event.beta - 90); // assuming holding phone upright
       this.deviceRoll = THREE.MathUtils.degToRad(event.gamma);
       this.deviceYaw = event.alpha !== null ? THREE.MathUtils.degToRad(event.alpha) : 0;
       
       this.threeService.updateCameraOrientation(this.devicePitch, this.deviceYaw, this.deviceRoll, this.selfieMode);
    }
  }

  toggleSelfieMode() {
    this.selfieMode = !this.selfieMode;
    if (this.selfieMode) {
      // Request permission for iOS 13+ devices
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((permissionState: string) => {
            if (permissionState === 'granted') {
              this.threeService.updateCameraOrientation(this.devicePitch, this.deviceYaw, this.deviceRoll, this.selfieMode);
            } else {
              this.selfieMode = false;
              this.threeService.updateCameraOrientation(0, 0, 0, false);
            }
          })
          .catch(console.error);
      } else {
          this.threeService.updateCameraOrientation(this.devicePitch, this.deviceYaw, this.deviceRoll, this.selfieMode);
      }
    } else {
      // Reset camera orientation
      this.threeService.updateCameraOrientation(0, 0, 0, false);
    }
  }

  updateAtmosphere() {
    this.threeService.setAtmosphere(this.hemiIntensity, this.dirIntensity, this.exposure);
  }

  applyPerformanceSettings() {
    localStorage.setItem('cameraResolution', this.perfRes);
    localStorage.setItem('pixelRatio', this.perfPixelRatio);
    localStorage.setItem('disableShadows', this.perfDisableShadows.toString());
    localStorage.setItem('disableAntialiasing', this.perfDisableAntialiasing.toString());
    window.location.reload();
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isLoadingAvatar = true;
      try {
        await this.modelStorage.saveModel(file);
        await this.refreshModels();
      } catch (e) {
        console.error('Failed to save model', e);
      }
      
      try {
        const url = URL.createObjectURL(file);
        await this.threeService.loadVRM(url);
        if (!this.isTrackingInitialized) {
          this.startFaceTracking();
          this.isTrackingInitialized = true;
        }
      } catch(e) {
        console.error(e);
      } finally {
        this.isLoadingAvatar = false;
      }
    }
  }

  async loadSavedModel(id: string) {
    this.isLoadingAvatar = true;
    try {
      const buffer = await this.modelStorage.getModelBuffer(id);
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);
      await this.threeService.loadVRM(url);
      if (!this.isTrackingInitialized) {
        this.startFaceTracking();
        this.isTrackingInitialized = true;
      }
    } catch (e) {
      console.error('Failed to load saved model', e);
    } finally {
      this.isLoadingAvatar = false;
    }
  }

  async deleteModel(id: string, event: Event) {
    event.stopPropagation();
    try {
      await this.modelStorage.deleteModel(id);
      await this.refreshModels();
    } catch (e) {
      console.error('Failed to delete model', e);
    }
  }

  async toggleFullscreen() {
    if (!document.fullscreenElement) {
      // The fullscreen stretching issue is fixed by resizing properly in onResize listener 
      // but also calling resize immediately after entering FS.
      await this.containerRef.nativeElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  private onFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
    setTimeout(() => {
      this.threeService.onResize();
    }, 100);
  }

  onBackgroundChange() {
    this.threeService.setBackground(this.backgroundType);
  }

  toggleMirror() {
    this.isMirrored = !this.isMirrored;
  }

  toggleCameraView() {
    this.showCameraView = !this.showCameraView;
  }

  toggleRecording() {
    if (this.isRecording) {
      if (this.mediaRecorder) this.mediaRecorder.stop();
      this.isRecording = false;
    } else {
      const canvasStream = this.canvasRef.nativeElement.captureStream(30);
      let outputStream = new MediaStream([...canvasStream.getTracks()]);
      
      const userStream = this.faceTracking.getStream();
      if (userStream && this.isMicrophoneEnabled) {
          userStream.getAudioTracks().forEach(track => {
             if (track.enabled) {
                 outputStream.addTrack(track);
             }
          });
      }

      let options: any = { mimeType: 'video/webm; codecs=vp8', videoBitsPerSecond: 2500000 }; 
      if (!(window as any).MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm', videoBitsPerSecond: 2500000 };
      }
      this.mediaRecorder = new (window as any).MediaRecorder(outputStream, options);
      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (e: any) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `virtual-me-recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };
      this.mediaRecorder.start();
      this.isRecording = true;
    }
  }

  toggleCameraState() {
      this.isCameraEnabled = !this.isCameraEnabled;
      this.faceTracking.setVideoEnabled(this.isCameraEnabled);
  }

  async toggleMicrophoneState() {
      this.isMicrophoneEnabled = !this.isMicrophoneEnabled;
      this.faceTracking.setAudioEnabled(this.isMicrophoneEnabled);
  }

  installApp() {
      if (this.deferredInstallPrompt) {
          this.deferredInstallPrompt.prompt();
          this.deferredInstallPrompt.userChoice.then((choiceResult: any) => {
              if (choiceResult.outcome === 'accepted') {
                  this.deferredInstallPrompt = null;
              }
          });
      }
  }

  calibrateFace() {
    // Reset neutral pose mapping
    this.pitchOffset = this.rawPitch;
    this.yawOffset = this.rawYaw;
    this.rollOffset = this.rawRoll;

    for (const key of Object.keys(this.rawBlendshapes)) {
       this.blendshapeOffsets[key] = this.rawBlendshapes[key];
    }
    
    // UI Flash effect
    this.calibrationFlash = true;
    setTimeout(() => {
       this.calibrationFlash = false;
    }, 150);
  }

  private startFaceTracking() {
    const resSetting = localStorage.getItem('cameraResolution') || 'medium';
    let width = 320;
    let height = 240;
    if (resSetting === 'high') { width = 640; height = 480; }
    else if (resSetting === 'low') { width = 160; height = 120; }

    this.faceTracking.initFaceTracking(
      this.videoRef.nativeElement, 
      (faceResults, poseResults, handResults) => {
        if (faceResults?.faceLandmarks && faceResults.faceLandmarks.length > 0) {
          const solvedFace = Kalidokit.Face.solve(
            faceResults.faceLandmarks[0],
            {
              runtime: "mediapipe",
              video: this.videoRef.nativeElement,
              smoothBlink: true,
              imageSize: { width: width, height: height }
            }
          );
          if (solvedFace) {
             this.targetFaceData = solvedFace;
             // Use Kalidokit's heavily stabilized head rotations instead of raw matrix
             if (solvedFace.head) {
                 this.rawPitch = solvedFace.head.x;
                 this.rawYaw = solvedFace.head.y;
                 this.rawRoll = solvedFace.head.z;
             }
          }
        }
        
        if (faceResults?.facialTransformationMatrixes && faceResults.facialTransformationMatrixes.length > 0) {
          const matrix = faceResults.facialTransformationMatrixes[0].data;
          
          // still use matrix translation for body placement
          this.targetTx = matrix[12] * 0.05; 
          this.targetTy = -matrix[13] * 0.05;
          this.targetTz = matrix[14] * 0.05;
          
          this.targetPitch = this.rawPitch - this.pitchOffset;
          this.targetYaw = this.rawYaw - this.yawOffset;
          this.targetRoll = this.rawRoll - this.rollOffset;
        }
        
        if (faceResults?.faceBlendshapes && faceResults.faceBlendshapes.length > 0) {
          const blendshapes = faceResults.faceBlendshapes[0].categories;
          blendshapes.forEach((shape: any) => {
            this.rawBlendshapes[shape.categoryName] = shape.score;
            let offset = this.blendshapeOffsets[shape.categoryName] || 0;
            
            const nameLower = shape.categoryName.toLowerCase();
            if (nameLower.includes('jaw') || nameLower.includes('mouth')) {
               offset = 0; // 1-to-1 mouth movements, no calibration offset
            }
            
            let score = shape.score - offset;
            if (shape.categoryName === 'jawOpen') {
               score = score * 2.0; // amplify for better responsiveness
            }

            // Subtract offset and clamp strictly between 0 and 1
            this.targetBlendshapes[shape.categoryName] = Math.max(0, Math.min(2, score)); // allow >1 for wider opens? VRM clamps to 1 anyway, but let's clamp here to 1
            this.targetBlendshapes[shape.categoryName] = Math.max(0, Math.min(1.0, score));
          });
        }
        
        let mergedPose: any = {};
        
        // Cache kalidokit solved results to save CPU
        if (poseResults && poseResults !== this.lastRawPoseResults) {
            this.lastRawPoseResults = poseResults;
            if (poseResults.landmarks?.length > 0 && poseResults.worldLandmarks?.length > 0) {
              this.cachedSolvedPose = Kalidokit.Pose.solve(
                poseResults.worldLandmarks[0],
                poseResults.landmarks[0],
                {
                  runtime: "mediapipe",
                  video: this.videoRef.nativeElement,
                }
              );
            } else {
              this.cachedSolvedPose = null;
            }
        }
        
        const solvedPose = this.cachedSolvedPose;
          
          if (solvedPose) {
             const lm = poseResults.landmarks[0];
             const THRESH = 0.5;
             
             // Check visibility of arms using wrists and elbows
             let pose = solvedPose as any;
             const leftArmVisible = lm[13].visibility > THRESH && lm[15].visibility > THRESH;
             const rightArmVisible = lm[14].visibility > THRESH && lm[16].visibility > THRESH;
             const bodyVisible = lm[11].visibility > THRESH || lm[12].visibility > THRESH;
             
             // If not visible, let them rest naturally down
             if (!leftArmVisible) {
                pose.LeftUpperArm = { x: 0, y: 0, z: 1.25 }; // 1.25 rad outwards = naturally down
                pose.LeftLowerArm = { x: 0, y: 0, z: 0 };
                pose.LeftHand = { x: 0, y: 0, z: 0 };
             }
             if (!rightArmVisible) {
                pose.RightUpperArm = { x: 0, y: 0, z: -1.25 }; // -1.25 rad outwards = naturally down
                pose.RightLowerArm = { x: 0, y: 0, z: 0 };
                pose.RightHand = { x: 0, y: 0, z: 0 };
             }
             if (!bodyVisible) {
                delete pose.Hips;
                delete pose.Spine;
             }
             
             mergedPose = pose;
          }
        
        if (handResults && handResults !== this.lastRawHandResults) {
            this.lastRawHandResults = handResults;
            this.cachedSolvedHands = [];
            if (handResults.landmarks?.length > 0) {
                handResults.landmarks.forEach((landmarks: any, index: number) => {
                    const isRight = handResults.handedness[index][0].categoryName === 'Right';
                    const solvedHand = Kalidokit.Hand.solve(landmarks, isRight ? 'Right' : 'Left');
                    if (solvedHand) {
                        this.cachedSolvedHands.push({ isRight, solvedHand });
                    }
                });
            }
        }
        
        if (this.cachedSolvedHands) {
            this.cachedSolvedHands.forEach((hand: any) => {
                const { isRight, solvedHand } = hand;
                if (solvedHand) {
                    const prefix = isRight ? 'Right' : 'Left';
                    
                    // Replace Kalidokit Hand results into our merged pose
                    mergedPose[`${prefix}Hand`] = solvedHand[`${prefix}Wrist`];
                    
                    // Fingers
                    mergedPose[`${prefix}ThumbProximal`] = solvedHand[`${prefix}ThumbProximal`];
                    mergedPose[`${prefix}ThumbIntermediate`] = solvedHand[`${prefix}ThumbIntermediate`];
                    mergedPose[`${prefix}ThumbDistal`] = solvedHand[`${prefix}ThumbDistal`];
                    
                    mergedPose[`${prefix}IndexProximal`] = solvedHand[`${prefix}IndexProximal`];
                    mergedPose[`${prefix}IndexIntermediate`] = solvedHand[`${prefix}IndexIntermediate`];
                    mergedPose[`${prefix}IndexDistal`] = solvedHand[`${prefix}IndexDistal`];
                    
                    mergedPose[`${prefix}MiddleProximal`] = solvedHand[`${prefix}MiddleProximal`];
                    mergedPose[`${prefix}MiddleIntermediate`] = solvedHand[`${prefix}MiddleIntermediate`];
                    mergedPose[`${prefix}MiddleDistal`] = solvedHand[`${prefix}MiddleDistal`];
                    
                    mergedPose[`${prefix}RingProximal`] = solvedHand[`${prefix}RingProximal`];
                    mergedPose[`${prefix}RingIntermediate`] = solvedHand[`${prefix}RingIntermediate`];
                    mergedPose[`${prefix}RingDistal`] = solvedHand[`${prefix}RingDistal`];
                    
                    mergedPose[`${prefix}LittleProximal`] = solvedHand[`${prefix}LittleProximal`];
                    mergedPose[`${prefix}LittleIntermediate`] = solvedHand[`${prefix}LittleIntermediate`];
                    mergedPose[`${prefix}LittleDistal`] = solvedHand[`${prefix}LittleDistal`];
                }
            });
        }
        
        if (Object.keys(mergedPose).length > 0) {
            this.targetPoseRotations = mergedPose;
        }

        // Feed the same solved data the 3D VRM already uses into the 2D
        // character system, so both renderers stay perfectly in sync.
        this.poseBridge.update(this.targetPoseRotations, this.targetFaceData, this.targetBlendshapes);
      },
      (error) => {
        this.cameraError = error?.message || 'Permission denied or unable to access the camera.';
      }
    );
  }

  private lerpAngle(start: number, end: number, t: number): number {
    start = isNaN(start) ? 0 : start;
    end = isNaN(end) ? 0 : end;

    // Normalize start to (-PI, PI] to prevent infinite winding accumulation
    while (start <= -Math.PI) start += Math.PI * 2;
    while (start > Math.PI) start -= Math.PI * 2;

    let diff = end - start;
    while (diff <= -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    
    let adaptiveT = t;
    // Prevent micro-jitters by heavily smoothing small noise
    if (Math.abs(diff) < 0.03) {
        adaptiveT = t * 0.2; 
    } else if (Math.abs(diff) > 0.1) { // ~5.7 degrees threshold
        adaptiveT = Math.min(1.0, t * 3.0); 
    }
    
    return start + (diff * adaptiveT);
  }

  private adaptiveLerp(start: number, end: number, t: number, threshold: number = 0.02): number {
    start = isNaN(start) ? 0 : start;
    end = isNaN(end) ? 0 : end;
    let diff = end - start;
    
    let adaptiveT = t;
    // Smooth out micro-jitters heavily
    if (Math.abs(diff) < (threshold * 0.5)) {
        adaptiveT = t * 0.2;
    } else if (Math.abs(diff) > threshold) {
        adaptiveT = Math.min(1.0, t * 3.0);
    }
    return start + (diff * adaptiveT);
  }

  private startSmoothUpdateLoop() {
    let lastTime = performance.now();
    let lastRenderTime = 0;
    const RENDER_INTERVAL = 1000 / 30; // 30 FPS
    
    const loop = (now: number) => {
      requestAnimationFrame(loop);
      
      if (now - lastRenderTime < RENDER_INTERVAL) {
        return;
      }
      lastRenderTime = now;
      this.perfMonitor.recordFrame();
        
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        const lerpFactor = 1 - Math.exp(-this.smoothing * delta); // Frame-rate independent smoothing

        if (!this.isCameraEnabled) {
            this.targetPitch = 0;
            this.targetYaw = 0;
            this.targetRoll = 0;
            this.targetTx = 0;
            this.targetTy = 0;
            this.targetTz = 0;
            this.targetPoseRotations = {};
            
            for (const key of Object.keys(this.targetBlendshapes)) {
                this.targetBlendshapes[key] = 0;
            }
        }

      // Interpolate Rotations
      // If mirrored, flip the yaw and roll
      const finalYaw = this.targetYaw;
      const finalRoll = this.targetRoll;

      this.currentPitch = this.lerpAngle(this.currentPitch, this.targetPitch, lerpFactor);
      this.currentYaw = this.lerpAngle(this.currentYaw, finalYaw, lerpFactor);
      this.currentRoll = this.lerpAngle(this.currentRoll, finalRoll, lerpFactor);

      const finalTx = this.isMirrored ? -this.targetTx : this.targetTx; // mirror x translation

      this.currentTx = this.adaptiveLerp(this.currentTx, finalTx, lerpFactor, 0.01);
      this.currentTy = this.adaptiveLerp(this.currentTy, this.targetTy, lerpFactor, 0.01);
      this.currentTz = this.adaptiveLerp(this.currentTz, this.targetTz, lerpFactor, 0.01);

      this.threeService.updateHeadRotation(
        this.currentPitch, this.currentYaw, this.currentRoll,
        this.currentTx, this.currentTy, this.currentTz,
        this.isMirrored
      );

      // Interpolate Blendshapes
      const vrmBlendshapeMap: Record<string, string> = {
        'jawOpen': 'aa',
        'mouthPucker': 'ou',
        'mouthShrugUpper': 'ih',
        'mouthRollUpper': 'oh',
        'browInnerUp': 'sad',
      };

      // Handle asymmetrical mappings based on mirror mode
      const leftSuffix = this.isMirrored ? 'Right' : 'Left';
      const rightSuffix = this.isMirrored ? 'Left' : 'Right';

      vrmBlendshapeMap['eyeBlinkLeft'] = `blink${leftSuffix}`;
      vrmBlendshapeMap['eyeBlinkRight'] = `blink${rightSuffix}`;
      vrmBlendshapeMap['mouthSmileLeft'] = 'happy';
      vrmBlendshapeMap['mouthSmileRight'] = 'happy';
      vrmBlendshapeMap['browDownLeft'] = 'angry';
      vrmBlendshapeMap['browDownRight'] = 'angry';
      vrmBlendshapeMap['eyeSquintLeft'] = 'relaxed';
      vrmBlendshapeMap['eyeSquintRight'] = 'relaxed';
      vrmBlendshapeMap['browOuterUpLeft'] = 'surprised';
      vrmBlendshapeMap['browOuterUpRight'] = 'surprised';

      const appliedVrmShapes: Record<string, number> = {};

      for (const [name, targetVal] of Object.entries(this.targetBlendshapes)) {
        const targetCleanVal = isNaN(targetVal) ? 0 : targetVal;
        const currentVal = this.currentBlendshapes[name] || 0;
        
        let customThreshold = 0.05;
        if (name.toLowerCase().includes('jaw') || name.toLowerCase().includes('mouth')) {
           customThreshold = 0.02; // Very sensitive adaptive threshold for mouth to reduce speech latency
        }

        const smoothVal = this.adaptiveLerp(currentVal, targetCleanVal, lerpFactor, customThreshold);
        this.currentBlendshapes[name] = smoothVal;
        
        // Map to VRM expression
        const vrmName = vrmBlendshapeMap[name];
        if (vrmName) {
           appliedVrmShapes[vrmName] = Math.max(appliedVrmShapes[vrmName] || 0, smoothVal);
        }
      }

      // Apply the maximally mapped blendshapes
      for (const [vrmName, val] of Object.entries(appliedVrmShapes)) {
          this.threeService.applyBlendshape(vrmName, val);
      }

      // Interpolate and apply body pose
      for (const [boneName, targetEuler] of Object.entries(this.targetPoseRotations)) {
          if (!this.currentPoseRotations[boneName]) {
              // Initialize to the target to avoid lerping from 0,0,0 (huge twitch)
              this.currentPoseRotations[boneName] = { x: targetEuler.x, y: targetEuler.y, z: targetEuler.z };
          }
          const currentE = this.currentPoseRotations[boneName];
          currentE.x = this.lerpAngle(currentE.x, targetEuler.x, lerpFactor);
          currentE.y = this.lerpAngle(currentE.y, targetEuler.y, lerpFactor);
          currentE.z = this.lerpAngle(currentE.z, targetEuler.z, lerpFactor);
      }
      
      if (Object.keys(this.currentPoseRotations).length > 0) {
          this.threeService.updatePoseRotation(this.currentPoseRotations, this.isMirrored);
      }
    };
    
    this.ngZone.runOutsideAngular(() => requestAnimationFrame(loop));
  }

  private matrixToEuler(matrix: Float32Array) {
    const m11 = matrix[0], m12 = matrix[4], m13 = matrix[8];
    const m21 = matrix[1], m22 = matrix[5], m23 = matrix[9];
    const m31 = matrix[2], m32 = matrix[6], m33 = matrix[10];

    let y = Math.asin(Math.max(-1, Math.min(1, m13)));
    let x, z;
    if (Math.abs(m13) < 0.99999) {
        x = Math.atan2(-m23, m33);
        z = Math.atan2(-m12, m11);
    } else {
        x = Math.atan2(m32, m22);
        z = 0;
    }
    return { x, y, z };
  }
}
