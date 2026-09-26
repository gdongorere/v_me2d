/**
 * V-Me 2D Character Renderer Service
 * Canvas-based layered rendering system for 2D characters
 */

import { Injectable, NgZone } from '@angular/core';
import {
  Character2D,
  BodyTransforms,
  FacialExpressions,
  Transform2D,
  AnimationFrame,
} from '../models/character-2d.models';

type LayerType =
  | 'shadow'
  | 'body'
  | 'legs'
  | 'bottom-wear'
  | 'top-wear'
  | 'arms'
  | 'hands'
  | 'neck'
  | 'face-base'
  | 'face-features'
  | 'hair-back'
  | 'hair-front'
  | 'accessories'
  | 'expressions';

interface RenderedLayer {
  type: LayerType;
  canvas?: OffscreenCanvas;
  cached?: ImageData;
  lastUpdate: number;
}

@Injectable({
  providedIn: 'root',
})
export class Character2DRendererService {
  private mainCanvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private offscreenCanvases: Map<string, OffscreenCanvas> = new Map();
  private renderCache: Map<string, ImageData> = new Map();

  // Layer rendering order
  private readonly layerOrder: LayerType[] = [
    'shadow',
    'body',
    'legs',
    'bottom-wear',
    'top-wear',
    'arms',
    'hands',
    'neck',
    'face-base',
    'face-features',
    'hair-back',
    'hair-front',
    'accessories',
    'expressions',
  ];

  private canvasWidth = 800;
  private canvasHeight = 1000;
  private centerX = this.canvasWidth / 2;
  private centerY = this.canvasHeight / 2;

  constructor(private ngZone: NgZone) {}

  /**
   * Initialize the renderer with a canvas element
   */
  init(canvas: HTMLCanvasElement): void {
    this.mainCanvas = canvas;
    this.mainCanvas.width = this.canvasWidth;
    this.mainCanvas.height = this.canvasHeight;

    const ctx = this.mainCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to initialize canvas context');
    this.ctx = ctx;

    // Enable image smoothing for better quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Main render loop - called every frame
   */
  render(
    character: Character2D,
    bodyTransforms: BodyTransforms,
    expressions: FacialExpressions
  ): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // Render each layer
    for (const layerType of this.layerOrder) {
      this.renderLayer(
        layerType,
        character,
        bodyTransforms,
        expressions
      );
    }
  }

  /**
   * Render individual layer with pose-aware deformation
   */
  private renderLayer(
    type: LayerType,
    character: Character2D,
    transforms: BodyTransforms,
    expressions: FacialExpressions
  ): void {
    this.ctx.save();

    try {
      switch (type) {
        case 'shadow':
          this.renderShadow(transforms.torso);
          break;
        case 'body':
          this.renderBody(character, transforms);
          break;
        case 'legs':
          this.renderLegs(character, transforms);
          break;
        case 'bottom-wear':
          this.renderBottomWear(character, transforms);
          break;
        case 'top-wear':
          this.renderTopWear(character, transforms);
          break;
        case 'arms':
          this.renderArms(character, transforms);
          break;
        case 'hands':
          this.renderHands(character, transforms);
          break;
        case 'neck':
          this.renderNeck(character, transforms);
          break;
        case 'face-base':
          this.renderFaceBase(character, transforms);
          break;
        case 'face-features':
          this.renderFaceFeatures(character, transforms, expressions);
          break;
        case 'hair-back':
          this.renderHairBack(character, transforms);
          break;
        case 'hair-front':
          this.renderHairFront(character, transforms);
          break;
        case 'accessories':
          this.renderAccessories(character, transforms);
          break;
        case 'expressions':
          this.renderExpressions(character, transforms, expressions);
          break;
      }
    } finally {
      this.ctx.restore();
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Layer Rendering Methods
  // ─────────────────────────────────────────────────────────────────

  private renderShadow(torsoTransform: Transform2D): void {
    const x = this.centerX + torsoTransform.position.x;
    const y = this.centerY + torsoTransform.position.y + 400;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, 100 * torsoTransform.scale, 20 * torsoTransform.scale, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderBody(character: Character2D, transforms: BodyTransforms): void {
    const { base } = character;
    const torso = transforms.torso;

    const x = this.centerX + torso.position.x;
    const y = this.centerY + torso.position.y;
    const scale = torso.scale * (base.height || 1);

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(torso.rotation);
    this.ctx.scale(scale, scale);

    // Draw stylized body
    this.ctx.fillStyle = base.skinTone || '#f8c5a0';

    // Torso
    this.ctx.fillRect(-30, -40, 60, 80);

    // Shoulders (enhanced by shoulderWidth)
    const shoulderWidth = (base.shoulderWidth || 1) * 35;
    this.ctx.fillRect(-shoulderWidth, -30, shoulderWidth * 2, 20);

    this.ctx.restore();
  }

  private renderLegs(character: Character2D, transforms: BodyTransforms): void {
    const { base } = character;
    const leftLeg = transforms.leftLeg;
    const rightLeg = transforms.rightLeg;
    const scale = base.height || 1;

    this.renderLeg(leftLeg, base.skinTone || '#f8c5a0', scale, 'left');
    this.renderLeg(rightLeg, base.skinTone || '#f8c5a0', scale, 'right');
  }

  private renderLeg(
    transform: Transform2D,
    skinTone: string,
    scale: number,
    side: 'left' | 'right'
  ): void {
    const x = this.centerX + transform.position.x + (side === 'left' ? -15 : 15) * scale;
    const y = this.centerY + transform.position.y;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(transform.rotation);
    this.ctx.scale(transform.scale * scale, transform.scale * scale);

    this.ctx.fillStyle = skinTone;
    this.ctx.fillRect(-8, 0, 16, 120);

    this.ctx.restore();
  }

  private renderBottomWear(character: Character2D, transforms: BodyTransforms): void {
    const outfit = character.outfit.find((o) => o.type === 'bottom');
    if (!outfit) return;

    const scale = (character.base.height || 1) * transforms.torso.scale;
    const x = this.centerX + transforms.leftLeg.position.x;
    const y = this.centerY + transforms.leftLeg.position.y;

    // Simplified pants rendering
    this.ctx.fillStyle = outfit.colors.primary;
    this.ctx.fillRect(x - 25, y + 40, 50, 80);

    // Add secondary color if exists
    if (outfit.colors.secondary) {
      this.ctx.fillStyle = outfit.colors.secondary;
      this.ctx.fillRect(x - 25, y + 120, 50, 10);
    }
  }

  private renderTopWear(character: Character2D, transforms: BodyTransforms): void {
    const outfit = character.outfit.find((o) => o.type === 'top');
    if (!outfit) return;

    const torso = transforms.torso;
    const x = this.centerX + torso.position.x;
    const y = this.centerY + torso.position.y;
    const scale = torso.scale * (character.base.height || 1);

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(torso.rotation);
    this.ctx.scale(scale, scale);

    this.ctx.fillStyle = outfit.colors.primary;
    this.ctx.fillRect(-35, -30, 70, 60);

    this.ctx.restore();
  }

  private renderArms(character: Character2D, transforms: BodyTransforms): void {
    const { base } = character;
    const scale = base.height || 1;

    this.renderArm(transforms.leftArm, base.skinTone || '#f8c5a0', scale, 'left');
    this.renderArm(transforms.rightArm, base.skinTone || '#f8c5a0', scale, 'right');
  }

  private renderArm(
    transform: Transform2D,
    skinTone: string,
    scale: number,
    side: 'left' | 'right'
  ): void {
    const offsetX = side === 'left' ? -40 : 40;
    const x = this.centerX + transform.position.x + offsetX * scale;
    const y = this.centerY + transform.position.y;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(transform.rotation);
    this.ctx.scale(transform.scale * scale, transform.scale * scale);

    this.ctx.fillStyle = skinTone;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(-8, 100);
    this.ctx.lineTo(8, 100);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  private renderHands(character: Character2D, transforms: BodyTransforms): void {
    const scale = (character.base.height || 1) * 0.3;
    this.renderHand(transforms.leftHand, character.base.skinTone || '#f8c5a0', scale, 'left');
    this.renderHand(transforms.rightHand, character.base.skinTone || '#f8c5a0', scale, 'right');
  }

  private renderHand(transform: Transform2D, skinTone: string, scale: number, side: 'left' | 'right'): void {
    const x = this.centerX + transform.position.x;
    const y = this.centerY + transform.position.y + 100;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(transform.rotation);
    this.ctx.scale(scale, scale);

    this.ctx.fillStyle = skinTone;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private renderNeck(character: Character2D, transforms: BodyTransforms): void {
    const scale = (character.base.height || 1) * transforms.torso.scale;
    const x = this.centerX + transforms.neck.position.x;
    const y = this.centerY + transforms.neck.position.y;

    this.ctx.fillStyle = character.base.skinTone || '#f8c5a0';
    this.ctx.fillRect(x - 10, y - 15, 20, 30);
  }

  private renderFaceBase(character: Character2D, transforms: BodyTransforms): void {
    const head = transforms.head;
    const x = this.centerX + head.position.x;
    const y = this.centerY + head.position.y;
    const scale = head.scale * (character.base.height || 1);

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(head.rotation);
    this.ctx.scale(scale, scale);

    this.ctx.fillStyle = character.base.skinTone || '#f8c5a0';

    // Draw face oval based on face shape
    const faceShape = character.features.faceShape || 'oval';
    this.drawFaceShape(faceShape, 0, 0, 40, 50);

    this.ctx.restore();
  }

  private drawFaceShape(shape: string, x: number, y: number, width: number, height: number): void {
    switch (shape) {
      case 'round':
        this.ctx.beginPath();
        this.ctx.arc(x, y, width, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'oval':
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
        this.ctx.fill();
        break;
      case 'square':
        this.ctx.fillRect(x - width, y - height, width * 2, height * 2);
        break;
      default:
        // Fallback to oval
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }
  }

  private renderFaceFeatures(
    character: Character2D,
    transforms: BodyTransforms,
    expressions: FacialExpressions
  ): void {
    const head = transforms.head;
    const x = this.centerX + head.position.x;
    const y = this.centerY + head.position.y;
    const scale = head.scale * (character.base.height || 1) * 0.8;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(head.rotation);
    this.ctx.scale(scale, scale);

    const { eyes, nose, mouth, brows } = character.features;

    // Eyes
    this.renderEyes(eyes, expressions, x, y, scale);

    // Nose
    this.renderNose(nose);

    // Mouth
    this.renderMouth(mouth, expressions);

    // Brows
    this.renderBrows(brows);

    this.ctx.restore();
  }

  private renderEyes(
    eyeFeatures: any,
    expressions: FacialExpressions,
    x: number,
    y: number,
    scale: number
  ): void {
    const eyeSize = (eyeFeatures.size || 1) * 12;
    const distance = (eyeFeatures.distance || 1) * 15;
    const eyeOpeness = eyeFeatures.eyeOpeness?.left ?? 1;
    const eyeDirection = eyeFeatures.eyeDirection || { x: 0, y: 0 };

    // Left eye
    this.ctx.fillStyle = eyeFeatures.colorPrimary || '#6b4423';
    this.ctx.beginPath();
    this.ctx.ellipse(-distance, -5, eyeSize, eyeSize * eyeOpeness, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Right eye
    this.ctx.beginPath();
    this.ctx.ellipse(distance, -5, eyeSize, eyeSize * eyeOpeness, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Iris & shine
    if (eyeFeatures.iris?.hasShine) {
      this.ctx.fillStyle = eyeFeatures.iris.innerColor || '#1a1a1a';
      const irisSize = eyeSize * 0.6;
      this.ctx.beginPath();
      this.ctx.arc(-distance + eyeDirection.x * 5, -5 + eyeDirection.y * 3, irisSize, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.beginPath();
      this.ctx.arc(
        -distance + eyeDirection.x * 5 + 3,
        -5 + eyeDirection.y * 3 - 2,
        irisSize * 0.3,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }
  }

  private renderNose(noseFeatures: any): void {
    const noseWidth = (noseFeatures.width || 1) * 3;
    const noseLength = (noseFeatures.length || 1) * 8;

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(0, noseLength);
    this.ctx.stroke();

    // Nostrils
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.beginPath();
    this.ctx.arc(-noseWidth, noseLength, 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(noseWidth, noseLength, 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderMouth(mouthFeatures: any, expressions: FacialExpressions): void {
    const mouthWidth = (mouthFeatures.width || 1) * 20;
    const mouthOpenness = expressions.mouthOpenness || 0;

    this.ctx.strokeStyle = mouthFeatures.color || '#d97a6a';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(-mouthWidth, 20);
    this.ctx.quadraticCurveTo(0, 25 + mouthOpenness * 10, mouthWidth, 20);
    this.ctx.stroke();

    // Mouth fill if open
    if (mouthOpenness > 0.1) {
      this.ctx.fillStyle = 'rgba(100, 50, 50, 0.3)';
      this.ctx.beginPath();
      this.ctx.moveTo(-mouthWidth, 20);
      this.ctx.quadraticCurveTo(0, 25 + mouthOpenness * 10, mouthWidth, 20);
      this.ctx.lineTo(mouthWidth, 22);
      this.ctx.quadraticCurveTo(0, 20 + mouthOpenness * 8, -mouthWidth, 22);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private renderBrows(browFeatures: any): void {
    const browLength = (browFeatures.length || 1) * 20;
    const browThickness = (browFeatures.thickness || 1) * 2;

    this.ctx.strokeStyle = browFeatures.color || '#8b6f47';
    this.ctx.lineWidth = browThickness;
    this.ctx.lineCap = 'round';

    // Left brow
    this.ctx.beginPath();
    this.ctx.moveTo(-browLength - 5, -20);
    this.ctx.quadraticCurveTo(-browLength / 2, -25, 5, -22);
    this.ctx.stroke();

    // Right brow
    this.ctx.beginPath();
    this.ctx.moveTo(browLength + 5, -20);
    this.ctx.quadraticCurveTo(browLength / 2, -25, -5, -22);
    this.ctx.stroke();
  }

  private renderHairBack(character: Character2D, transforms: BodyTransforms): void {
    // Back hair is rendered behind face
    const head = transforms.head;
    const { hair } = character;
    const x = this.centerX + head.position.x;
    const y = this.centerY + head.position.y;
    const scale = head.scale * (character.base.height || 1);

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(head.rotation);
    this.ctx.scale(scale, scale);

    this.ctx.fillStyle = hair.color || '#2d2d2d';

    // Simple back hair
    this.ctx.beginPath();
    this.ctx.ellipse(0, 5, 35, 45, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private renderHairFront(character: Character2D, transforms: BodyTransforms): void {
    // Front hair is rendered over face
    const head = transforms.head;
    const { hair } = character;
    const x = this.centerX + head.position.x;
    const y = this.centerY + head.position.y;
    const scale = head.scale * (character.base.height || 1);

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(head.rotation);
    this.ctx.scale(scale, scale);

    this.ctx.fillStyle = hair.color || '#2d2d2d';

    // Bangs
    const bangsStyle = hair.bangs || 'side-swept';
    switch (bangsStyle) {
      case 'straight':
        this.ctx.fillRect(-30, -45, 60, 20);
        break;
      case 'side-swept':
        this.ctx.beginPath();
        this.ctx.moveTo(-30, -45);
        this.ctx.quadraticCurveTo(-5, -50, 30, -40);
        this.ctx.lineTo(30, -25);
        this.ctx.quadraticCurveTo(-5, -30, -30, -25);
        this.ctx.closePath();
        this.ctx.fill();
        break;
      case 'wispy':
        for (let i = -30; i < 30; i += 10) {
          this.ctx.fillRect(i, -45, 6, 15);
        }
        break;
    }

    this.ctx.restore();
  }

  private renderAccessories(character: Character2D, transforms: BodyTransforms): void {
    for (const accessory of character.accessories) {
      const x = this.centerX + transforms.head.position.x + accessory.position.x * 40;
      const y = this.centerY + transforms.head.position.y + accessory.position.y * 40;

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(accessory.rotation);
      this.ctx.scale(accessory.scale, accessory.scale);

      this.ctx.fillStyle = accessory.color;

      // Simple accessory drawing based on type
      switch (accessory.type) {
        case 'glasses':
          this.ctx.strokeStyle = accessory.color;
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.arc(-10, -3, 8, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.beginPath();
          this.ctx.arc(10, -3, 8, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.beginPath();
          this.ctx.moveTo(-2, -3);
          this.ctx.lineTo(2, -3);
          this.ctx.stroke();
          break;
        case 'hat':
          this.ctx.fillRect(-20, -30, 40, 15);
          this.ctx.fillRect(-25, -15, 50, 3);
          break;
        case 'earrings':
          this.ctx.beginPath();
          this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.fillRect(-1, 3, 2, 8);
          break;
      }

      this.ctx.restore();
    }
  }

  private renderExpressions(
    character: Character2D,
    transforms: BodyTransforms,
    expressions: FacialExpressions
  ): void {
    // Blush based on emotion
    const emotionalIntensity = Math.max(
      expressions.smile || 0,
      expressions.surprise || 0,
      expressions.fear || 0
    );

    if (emotionalIntensity > 0.1) {
      const head = transforms.head;
      const x = this.centerX + head.position.x;
      const y = this.centerY + head.position.y;
      const scale = head.scale * (character.base.height || 1) * 0.8;

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(head.rotation);
      this.ctx.scale(scale, scale);

      this.ctx.fillStyle = `rgba(255, 100, 100, ${emotionalIntensity * 0.3})`;
      this.ctx.beginPath();
      this.ctx.ellipse(-20, 10, 8, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.ellipse(20, 10, 8, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  /**
   * Generate a thumbnail of the character
   */
  generateThumbnail(character: Character2D, size: number = 200): string {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw simplified character
    ctx.fillStyle = character.base.skinTone;
    ctx.beginPath();
    ctx.arc(size / 2, size / 3, size / 4, 0, Math.PI * 2);
    ctx.fill();

    // Hair color indicator
    ctx.fillStyle = character.hair.color;
    ctx.fillRect(size / 4, size / 6, size / 2, size / 3);

    return canvas.toDataURL();
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.offscreenCanvases.clear();
    this.renderCache.clear();
  }
}
