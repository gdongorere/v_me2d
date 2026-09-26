/**
 * V-Me Character Creator Component (standalone — matches this project's
 * pattern of standalone components with inline templates + Tailwind,
 * exactly like AppComponent. No Angular Material, no new npm packages.)
 *
 * Comprehensive multi-step wizard covering every field in Character2D:
 * Base body, full face (shape/eyes/nose/mouth/brows/cheekbones/chin/ears/
 * skin details/makeup), hair, outfit (top/bottom/shoes/outerwear),
 * accessories, and animation style. Live 2D preview updates instantly
 * because [(ngModel)] mutates the same `character` object instance that
 * Character2DDisplayComponent is rendering (no extra wiring needed).
 */

import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Character2D, createDefaultCharacter, OutfitLayers, Accessory } from '../models/character-2d.models';
import { Character2DDisplayComponent } from './character-2d-display.component';
import { Character2DStorageService } from '../services/character-2d-storage.service';
import {
  BODY_SHAPES,
  FACE_SHAPES,
  EYE_SHAPES,
  NOSE_SHAPES,
  MOUTH_SHAPES,
  BROW_SHAPES,
  CHIN_SHAPES,
  EAR_SHAPES,
  HAIRSTYLE_PRESETS,
  BANGS_STYLES,
  HAIR_TEXTURES,
  HAIR_LENGTHS,
  OUTFIT_STYLE_PRESETS,
  FIT_TYPES,
  SLEEVE_TYPES,
  NECKLINE_TYPES,
  ACCESSORY_TYPES,
  SKIN_TONE_SWATCHES,
  HAIR_COLOR_SWATCHES,
  EYE_COLOR_SWATCHES,
} from '../models/character-catalog.data';

type CreatorStep = 'body' | 'face' | 'hair' | 'outfit' | 'accessories' | 'animation' | 'review';

@Component({
  selector: 'app-character-creator',
  standalone: true,
  imports: [CommonModule, FormsModule, Character2DDisplayComponent],
  template: `
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
    <div class="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-5xl h-[90vh] flex overflow-hidden shadow-2xl">

      <!-- Live preview -->
      <div class="w-2/5 bg-gradient-to-br from-indigo-900 to-purple-900 relative">
        <app-character-2d-display [character]="character" [livePose]="false" class="w-full h-full"></app-character-2d-display>
        <div class="absolute top-3 left-3 right-3 flex gap-2">
          <input [(ngModel)]="character.name" placeholder="Character name"
                 class="flex-1 bg-black/40 text-white placeholder-white/50 rounded-lg px-3 py-2 text-sm outline-none border border-white/10" />
        </div>
        <button (click)="randomize()"
                class="absolute bottom-3 left-3 right-3 bg-white/10 hover:bg-white/20 text-white rounded-lg py-2 text-sm font-medium backdrop-blur">
          🎲 Randomize Everything
        </button>
      </div>

      <!-- Editor -->
      <div class="w-3/5 flex flex-col">
        <!-- Step tabs -->
        <div class="flex border-b border-white/10 overflow-x-auto shrink-0">
          <button *ngFor="let s of steps" (click)="currentStep = s.id"
                  [ngClass]="currentStep === s.id ? 'text-white border-indigo-500' : 'text-white/40'"
                  class="px-4 py-3 text-sm font-medium border-b-2 border-transparent whitespace-nowrap">
            {{ s.label }}
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-5 text-white/90 space-y-5">

          <!-- STEP: Body -->
          <ng-container *ngIf="currentStep === 'body'">
            <h3 class="text-lg font-semibold">Body</h3>
            <div class="grid grid-cols-2 gap-4">
              <label class="block text-sm">Body Shape
                <select [(ngModel)]="character.base.bodyShape" class="field">
                  <option *ngFor="let o of bodyShapes" [value]="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label class="block text-sm">Skin Tone
                <input type="color" [(ngModel)]="character.base.skinTone" class="field h-10" />
                <div class="flex gap-1 mt-1 flex-wrap">
                  <button *ngFor="let c of skinTones" (click)="character.base.skinTone = c"
                          [style.background]="c" class="w-6 h-6 rounded-full border border-white/20"></button>
                </div>
              </label>
              <label class="block text-sm">Height ({{ character.base.height | number:'1.1-1' }}x)
                <input type="range" min="0.8" max="1.5" step="0.05" [(ngModel)]="character.base.height" class="w-full" />
              </label>
              <label class="block text-sm">Shoulder Width ({{ character.base.shoulderWidth | number:'1.1-1' }}x)
                <input type="range" min="0.7" max="1.3" step="0.05" [(ngModel)]="character.base.shoulderWidth" class="w-full" />
              </label>
              <label class="block text-sm">Waist Narrowness ({{ character.base.waistNarrowness | number:'1.1-1' }}x)
                <input type="range" min="0.6" max="1.2" step="0.05" [(ngModel)]="character.base.waistNarrowness" class="w-full" />
              </label>
              <label class="block text-sm">Limb Length ({{ character.base.limbLength | number:'1.1-1' }}x)
                <input type="range" min="0.8" max="1.2" step="0.05" [(ngModel)]="character.base.limbLength" class="w-full" />
              </label>
            </div>
          </ng-container>

          <!-- STEP: Face -->
          <ng-container *ngIf="currentStep === 'face'">
            <h3 class="text-lg font-semibold">Face Shape & Structure</h3>
            <div class="grid grid-cols-2 gap-4">
              <label class="block text-sm">Face Shape
                <select [(ngModel)]="character.features.faceShape" class="field">
                  <option *ngFor="let o of faceShapes" [value]="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label class="block text-sm">Chin Shape
                <select [(ngModel)]="character.features.chin.shape" class="field">
                  <option *ngFor="let o of chinShapes" [value]="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label class="block text-sm">Cheekbone Prominence
                <select [(ngModel)]="character.features.cheekbones.prominence" class="field">
                  <option value="subtle">Subtle</option>
                  <option value="moderate">Moderate</option>
                  <option value="prominent">Prominent</option>
                </select>
              </label>
              <label class="block text-sm">Ear Shape
                <select [(ngModel)]="character.features.ears.shape" class="field">
                  <option *ngFor="let o of earShapes" [value]="o.value">{{ o.label }}</option>
                </select>
              </label>
            </div>

            <h3 class="text-lg font-semibold pt-2">Eyes</h3>
            <div class="grid grid-cols-2 gap-4">
              <label class="block text-sm">Eye Shape
                <select [(ngModel)]="character.features.eyes.shape" class="field">
                  <option *ngFor="let o of eyeShapes" [value]="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label class="block text-sm">Eye Color
                <input type="color" [(ngModel)]="character.features.eyes.colorPrimary" class="field h-10" />
                <div class="flex gap-1 mt-1 flex-wrap">
                  <button *ngFor="let c of eyeColors" (click)="character.features.eyes.colorPrimary = c"
                          [style.background]="c" class="w-6 h-6 rounded-full border border-white/20"></button>
                </div>
              </label>
              <label class="block text-sm">Eye Size ({{ character.features.eyes.size | number:'1.1-1' }}x)
                <input type="range" min="0.7" max="1.5" step="0.05" [(ngModel)]="character.features.eyes.size" class="w-full" />
              </label>
              <label class="block text-sm">Eye Spacing ({{ character.features.eyes.distance | number:'1.1-1' }}x)
                <input type="range" min="0.8" max="1.3" step="0.05" [(ngModel)]="character.features.eyes.distance" class="w-full" />
              </label>
              <label class="block text-sm">Eye Tilt ({{ character.features.eyes.tilt }}°)
                <input type="range" min="-30" max="30" step="1" [(ngModel)]="character.features.eyes.tilt" class="w-full" />
              </label>
              <label class="flex items-center gap-2 text-sm pt-5">
                <input type="checkbox" [(ngModel)]="character.features.eyes.iris.hasShine" />
                Eye shine / sparkle
              </label>
            </div>

            <h3 class="text-lg font-semibold pt-2">Eyebrows</h3>
            <div class="grid grid-cols-2 gap-4">
              <label class="block text-sm">Brow Shape
                <select [(ngModel)]="character.features.brows.shape" class="field">
                  <option *ngFor="let o of browShapes" [value]="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label class="block text-sm">Brow Color
                <input type="color" [(ngModel)]="character.features.brows.color" class="field h-10" />
              </label>
              <label class="block text-sm">Thickness ({{ character.features.brows.thickness | number:'1.1-1' }}x)
                <input type="range" min="0.5" max="2" step="0.1" [(ngModel)]="character.features.brows.thickness" class="w-full" />
              </label>
              <label class="block text-sm">Density ({{ character.features.brows.density | number:'1.1-1' }})
                <input type="range" min="0.3" max="1" step="0.05" [(ngModel)]="character.features.brows.density" class="w-full" />
              </label>
            </div>

            <h3 class="text-lg font-semibold pt-2">Nose</h3>
            <div class="grid grid-cols-2 gap-4">
              <label class="block text-sm">Nose Shape
                <select [(ngModel)]="character.features.nose.shape" class="field">
                  <option *ngFor="let o of noseShapes" [value]="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label class="block text-sm">Bridge
                <select [(ngModel)]="character.features.nose.bridge" class="field">
                  <option value="thin">Thin</option>
                  <option value="medium">Medium</option>
                  <option value="wide">Wide</option>
                  <option value="bumpy">Bumpy</option>
                </select>
              </label>
              <label class="block text-sm">Width ({{ character.features.nose.width | number:'1.1-1' }}x)
                <input type="range" min="0.6" max="1.4" step="0.05" [(ngModel)]="character.features.nose.width" class="w-full" />
              </label>
              <label class="block text-sm">Length ({{ character.features.nose.length | number:'1.1-1' }}x)
                <input type="range" min="0.7" max="1.3" step="0.05" [(ngModel)]="character.features.nose.length" class="w-full" />
              </label>
            </div>

            <h3 class="text-lg font-semibold pt-2">Mouth</h3>
            <div class="grid grid-cols-2 gap-4">
              <label class="block text-sm">Mouth Shape
                <select [(ngModel)]="character.features.mouth.shape" class="field">
                  <option *ngFor="let o of mouthShapes" [value]="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label class="block text-sm">Lip Color
                <input type="color" [(ngModel)]="character.features.mouth.color" class="field h-10" />
              </label>
              <label class="block text-sm">Lip Fullness
                <select [(ngModel)]="character.features.mouth.lipFullness" class="field">
                  <option value="thin">Thin</option>
                  <option value="medium">Medium</option>
                  <option value="full">Full</option>
                  <option value="very-full">Very Full</option>
                </select>
              </label>
              <label class="block text-sm">Width ({{ character.features.mouth.width | number:'1.1-1' }}x)
                <input type="range" min="0.7" max="1.3" step="0.05" [(ngModel)]="character.features.mouth.width" class="w-full" />
              </label>
              <label class="flex items-center gap-2 text-sm pt-5">
                <input type="checkbox" [(ngModel)]="character.features.mouth.gloss" />
                Lip gloss
              </label>
            </div>

            <h3 class="text-lg font-semibold pt-2">Skin Details</h3>
            <div class="grid grid-cols-2 gap-4">
              <label class="block text-sm">Texture
                <select [(ngModel)]="character.features.skinDetails.texture" class="field">
                  <option value="smooth">Smooth</option>
                  <option value="freckles">Freckles</option>
                  <option value="acne">Acne</option>
                  <option value="scars">Scars</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>
              <div *ngIf="character.features.skinDetails.texture === 'freckles'" class="text-sm">
                <label class="block">Freckle Density
                  <input type="range" min="0" max="1" step="0.05"
                         [ngModel]="character.features.skinDetails.freckles?.density ?? 0.3"
                         (ngModelChange)="setFreckleDensity($event)" class="w-full" />
                </label>
              </div>
            </div>
          </ng-container>

          <!-- STEP: Hair -->
          <ng-container *ngIf="currentStep === 'hair'">
            <h3 class="text-lg font-semibold">Hairstyle</h3>
            <div class="grid grid-cols-3 gap-2">
              <button *ngFor="let h of hairstylePresets" (click)="applyHairPreset(h)"
                      [class.ring-2]="character.hair.styleId === h.id"
                      class="ring-indigo-500 bg-white/5 hover:bg-white/10 rounded-lg p-2 text-xs text-left">
                {{ h.label }}
              </button>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-3">
              <label class="block text-sm">Hair Color
                <input type="color" [(ngModel)]="character.hair.color" class="field h-10" />
                <div class="flex gap-1 mt-1 flex-wrap">
                  <button *ngFor="let c of hairColors" (click)="character.hair.color = c"
                          [style.background]="c" class="w-6 h-6 rounded-full border border-white/20"></button>
                </div>
              </label>
              <label class="block text-sm">Under/Highlight Color (optional)
                <input type="color" [ngModel]="character.hair.underColor ?? character.hair.color"
                       (ngModelChange)="character.hair.underColor = $event" class="field h-10" />
              </label>
              <label class="block text-sm">Length
                <select [(ngModel)]="character.hair.length" class="field">
                  <option *ngFor="let o of hairLengths" [value]="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label class="block text-sm">Texture
                <select [(ngModel)]="character.hair.texture" class="field">
                  <option *ngFor="let o of hairTextures" [value]="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label class="block text-sm">Bangs
                <select [(ngModel)]="character.hair.bangs" class="field">
                  <option *ngFor="let o of bangsStyles" [value]="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label class="block text-sm">Volume ({{ character.hair.volume | number:'1.1-1' }}x)
                <input type="range" min="0.5" max="1.5" step="0.05" [(ngModel)]="character.hair.volume" class="w-full" />
              </label>
              <label class="block text-sm">Shine ({{ character.hair.shine | number:'1.1-1' }})
                <input type="range" min="0" max="1" step="0.05" [(ngModel)]="character.hair.shine" class="w-full" />
              </label>
            </div>
          </ng-container>

          <!-- STEP: Outfit -->
          <ng-container *ngIf="currentStep === 'outfit'">
            <div *ngFor="let layer of character.outfit; let i = index" class="border border-white/10 rounded-xl p-4 mb-3">
              <div class="flex justify-between items-center mb-2">
                <h4 class="font-semibold capitalize">{{ layer.type }}</h4>
                <button (click)="removeOutfitLayer(i)" class="text-red-400 text-xs">Remove</button>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <label class="block text-sm">Style
                  <select [(ngModel)]="layer.styleId" class="field">
                    <option *ngFor="let o of outfitPresetsFor(layer.type)" [value]="o.id">{{ o.label }}</option>
                  </select>
                </label>
                <label class="block text-sm">Fit
                  <select [(ngModel)]="layer.fit" class="field">
                    <option *ngFor="let o of fitTypes" [value]="o.value">{{ o.label }}</option>
                  </select>
                </label>
                <label class="block text-sm">Primary Color
                  <input type="color" [(ngModel)]="layer.colors.primary" class="field h-10" />
                </label>
                <label class="block text-sm">Secondary Color
                  <input type="color" [ngModel]="layer.colors.secondary ?? layer.colors.primary"
                         (ngModelChange)="layer.colors.secondary = $event" class="field h-10" />
                </label>
                <label class="block text-sm" *ngIf="layer.type === 'top' || layer.type === 'dress' || layer.type === 'outerwear'">
                  Sleeves
                  <select [(ngModel)]="layer.sleeves" class="field">
                    <option *ngFor="let o of sleeveTypes" [value]="o.value">{{ o.label }}</option>
                  </select>
                </label>
                <label class="block text-sm" *ngIf="layer.type === 'top' || layer.type === 'dress'">
                  Neckline
                  <select [(ngModel)]="layer.neckline" class="field">
                    <option *ngFor="let o of necklineTypes" [value]="o.value">{{ o.label }}</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="flex gap-2 flex-wrap">
              <button (click)="addOutfitLayer('top')" class="btn-secondary">+ Top</button>
              <button (click)="addOutfitLayer('bottom')" class="btn-secondary">+ Bottom</button>
              <button (click)="addOutfitLayer('dress')" class="btn-secondary">+ Dress</button>
              <button (click)="addOutfitLayer('shoes')" class="btn-secondary">+ Shoes</button>
              <button (click)="addOutfitLayer('outerwear')" class="btn-secondary">+ Outerwear</button>
            </div>
          </ng-container>

          <!-- STEP: Accessories -->
          <ng-container *ngIf="currentStep === 'accessories'">
            <div class="grid grid-cols-4 gap-2 mb-4">
              <button *ngFor="let a of accessoryTypes" (click)="addAccessory(a.value)"
                      class="bg-white/5 hover:bg-white/10 rounded-lg p-2 text-xs">
                + {{ a.label }}
              </button>
            </div>

            <div *ngFor="let acc of character.accessories; let i = index" class="border border-white/10 rounded-xl p-3 mb-2 flex items-center gap-3">
              <span class="text-sm capitalize flex-1">{{ acc.type }}</span>
              <input type="color" [(ngModel)]="acc.color" class="w-10 h-8 rounded" />
              <label class="text-xs">Scale
                <input type="range" min="0.5" max="2" step="0.1" [(ngModel)]="acc.scale" class="w-20 align-middle" />
              </label>
              <button (click)="removeAccessory(i)" class="text-red-400 text-xs">Remove</button>
            </div>
          </ng-container>

          <!-- STEP: Animation -->
          <ng-container *ngIf="currentStep === 'animation'">
            <h3 class="text-lg font-semibold">Personality & Motion</h3>
            <div class="grid grid-cols-2 gap-4">
              <label class="block text-sm">Expressiveness
                <select [(ngModel)]="character.animationStyle.expressiveness" class="field">
                  <option value="subtle">Subtle</option>
                  <option value="moderate">Moderate</option>
                  <option value="expressive">Expressive</option>
                  <option value="exaggerated">Exaggerated</option>
                  <option value="deadpan">Deadpan</option>
                </select>
              </label>
              <label class="block text-sm">Posture
                <select [(ngModel)]="character.animationStyle.posture" class="field">
                  <option value="slouch">Slouch</option>
                  <option value="neutral">Neutral</option>
                  <option value="upright">Upright</option>
                  <option value="confident">Confident</option>
                  <option value="hunched">Hunched</option>
                </select>
              </label>
              <label class="block text-sm">Idle Animation
                <select [(ngModel)]="character.animationStyle.idle" class="field">
                  <option value="static">Static</option>
                  <option value="breathing">Breathing</option>
                  <option value="sway">Gentle Sway</option>
                  <option value="fidget">Fidget</option>
                  <option value="bounce">Bounce</option>
                </select>
              </label>
              <label class="block text-sm">Blink Frequency ({{ character.animationStyle.blink.frequency }}/min)
                <input type="range" min="5" max="30" step="1" [(ngModel)]="character.animationStyle.blink.frequency" class="w-full" />
              </label>
            </div>
          </ng-container>

          <!-- STEP: Review -->
          <ng-container *ngIf="currentStep === 'review'">
            <h3 class="text-lg font-semibold">Review & Save</h3>
            <p class="text-sm text-white/60">Give your character a name (top-left of the preview) then save. You can always come back and edit every field above.</p>
            <div class="flex gap-2 flex-wrap pt-2">
              <span *ngFor="let tag of character.tags" class="bg-white/10 px-2 py-1 rounded-full text-xs">{{ tag }}</span>
            </div>
            <label class="block text-sm pt-2">Add tag
              <input #tagInput (keydown.enter)="addTag(tagInput.value); tagInput.value=''" placeholder="press Enter" class="field" />
            </label>
          </ng-container>

        </div>

        <!-- Footer nav -->
        <div class="flex justify-between items-center border-t border-white/10 p-4 shrink-0">
          <button (click)="prevStep()" [disabled]="stepIndex === 0" class="btn-secondary disabled:opacity-30">← Back</button>
          <div class="flex gap-2">
            <button (click)="onCancel()" class="btn-secondary">Cancel</button>
            <button *ngIf="stepIndex &lt; steps.length - 1" (click)="nextStep()" class="btn-primary">Next →</button>
            <button *ngIf="stepIndex === steps.length - 1" (click)="onSave()" class="btn-primary">Save Character</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .field {
      display: block;
      width: 100%;
      margin-top: 4px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 8px 10px;
      color: white;
      font-size: 14px;
    }
    .btn-primary {
      background: #6366f1;
      color: white;
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.08);
      color: white;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 13px;
    }
  `],
})
export class CharacterCreatorComponent implements OnInit {
  @Input() editingCharacter: Character2D | null = null;
  @Output() saved = new EventEmitter<Character2D>();
  @Output() cancelled = new EventEmitter<void>();

  character: Character2D = createDefaultCharacter();

  steps: { id: CreatorStep; label: string }[] = [
    { id: 'body', label: 'Body' },
    { id: 'face', label: 'Face' },
    { id: 'hair', label: 'Hair' },
    { id: 'outfit', label: 'Outfit' },
    { id: 'accessories', label: 'Accessories' },
    { id: 'animation', label: 'Animation' },
    { id: 'review', label: 'Review' },
  ];
  currentStep: CreatorStep = 'body';

  bodyShapes = BODY_SHAPES;
  faceShapes = FACE_SHAPES;
  eyeShapes = EYE_SHAPES;
  noseShapes = NOSE_SHAPES;
  mouthShapes = MOUTH_SHAPES;
  browShapes = BROW_SHAPES;
  chinShapes = CHIN_SHAPES;
  earShapes = EAR_SHAPES;
  hairstylePresets = HAIRSTYLE_PRESETS;
  bangsStyles = BANGS_STYLES;
  hairTextures = HAIR_TEXTURES;
  hairLengths = HAIR_LENGTHS;
  outfitStylePresets = OUTFIT_STYLE_PRESETS;
  fitTypes = FIT_TYPES;
  sleeveTypes = SLEEVE_TYPES;
  necklineTypes = NECKLINE_TYPES;
  accessoryTypes = ACCESSORY_TYPES;
  skinTones = SKIN_TONE_SWATCHES;
  hairColors = HAIR_COLOR_SWATCHES;
  eyeColors = EYE_COLOR_SWATCHES;

  constructor(private storage: Character2DStorageService) {}

  ngOnInit(): void {
    if (this.editingCharacter) {
      // Deep copy so cancelling doesn't mutate the saved original
      this.character = JSON.parse(JSON.stringify(this.editingCharacter));
    }
  }

  get stepIndex(): number {
    return this.steps.findIndex((s) => s.id === this.currentStep);
  }

  nextStep(): void {
    const i = this.stepIndex;
    if (i < this.steps.length - 1) this.currentStep = this.steps[i + 1].id;
  }

  prevStep(): void {
    const i = this.stepIndex;
    if (i > 0) this.currentStep = this.steps[i - 1].id;
  }

  outfitPresetsFor(type: string) {
    return this.outfitStylePresets.filter((p) => p.type === type);
  }

  applyHairPreset(preset: (typeof HAIRSTYLE_PRESETS)[number]): void {
    this.character.hair.styleId = preset.id;
    this.character.hair.length = preset.length;
    this.character.hair.texture = preset.texture;
    this.character.hair.bangs = preset.bangs;
  }

  setFreckleDensity(density: number): void {
    if (!this.character.features.skinDetails.freckles) {
      this.character.features.skinDetails.freckles = { count: 30, color: '#8b5a2b', density };
    } else {
      this.character.features.skinDetails.freckles.density = density;
    }
  }

  addOutfitLayer(type: OutfitLayers['type']): void {
    const preset = this.outfitPresetsFor(type)[0];
    const layer: OutfitLayers = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      styleId: preset?.id ?? 'custom',
      colors: { primary: '#888888' },
      fit: 'fitted',
    };
    this.character.outfit.push(layer);
  }

  removeOutfitLayer(index: number): void {
    this.character.outfit.splice(index, 1);
  }

  addAccessory(type: Accessory['type']): void {
    const accessory: Accessory = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      styleId: 'default',
      color: '#222222',
      position: { x: 0, y: 0, attachPoint: 'head' },
      scale: 1,
      rotation: 0,
    };
    this.character.accessories.push(accessory);
  }

  removeAccessory(index: number): void {
    this.character.accessories.splice(index, 1);
  }

  addTag(tag: string): void {
    const trimmed = tag.trim();
    if (trimmed && !this.character.tags.includes(trimmed)) {
      this.character.tags.push(trimmed);
    }
  }

  randomize(): void {
    const rand = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
    const randColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

    this.character.base.bodyShape = rand(this.bodyShapes).value;
    this.character.base.skinTone = rand(this.skinTones);
    this.character.base.height = 0.85 + Math.random() * 0.5;

    this.character.features.faceShape = rand(this.faceShapes).value;
    this.character.features.eyes.shape = rand(this.eyeShapes).value;
    this.character.features.eyes.colorPrimary = rand(this.eyeColors);
    this.character.features.nose.shape = rand(this.noseShapes).value;
    this.character.features.mouth.shape = rand(this.mouthShapes).value;
    this.character.features.mouth.color = randColor();
    this.character.features.brows.shape = rand(this.browShapes).value;

    this.applyHairPreset(rand(this.hairstylePresets));
    this.character.hair.color = rand(this.hairColors);

    if (this.character.outfit[0]) this.character.outfit[0].colors.primary = randColor();
    if (this.character.outfit[1]) this.character.outfit[1].colors.primary = randColor();
  }

  onSave(): void {
    if (!this.character.name || this.character.name === 'New Character') {
      this.character.name = `Character ${new Date().toLocaleDateString()}`;
    }
    this.saved.emit(this.character);
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
