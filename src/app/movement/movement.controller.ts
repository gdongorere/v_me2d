/**
 * V-Me Movement & Input System
 * Walk controller, input sources, and locomotion animation.
 * Ref: Environment Addendum §19.7, §19.11
 */

import * as THREE from 'three';
import {
  MoveInput,
  LocomotionState,
  Vec3,
} from '../environment/environment.models';
import { PhysicsWorldService } from '../environment/physics-world.service';

const WALK_SPEED = 1.4;
const RUN_SPEED = 3.2;

// ─────────────────────────────────────────────────────────────────
// Input Sources
// ─────────────────────────────────────────────────────────────────

export interface InputSource {
  update(): MoveInput;
  dispose(): void;
}

export class KeyboardInputSource implements InputSource {
  private keys: Set<string> = new Set();

  private readonly onKeyDown = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase());
  private readonly onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  update(): MoveInput {
    let dx = 0;
    let dz = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dz += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dz -= 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }

    return {
      dx,
      dz,
      run: this.keys.has('shift'),
    };
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}

export class JoystickInputSource implements InputSource {
  private container: HTMLElement;
  private joystick: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private touching = false;
  private touchX = 0;
  private touchY = 0;
  private baseX = 0;
  private baseY = 0;
  private readonly radius = 40;
  private readonly deadzone = 8;
  private input: MoveInput = { dx: 0, dz: 0, run: false };

  constructor(container: HTMLElement) {
    this.container = container;
    this.joystick = document.createElement('canvas');
    this.joystick.width = 120;
    this.joystick.height = 120;
    this.joystick.style.position = 'absolute';
    this.joystick.style.bottom = '20px';
    this.joystick.style.left = '20px';
    this.joystick.style.cursor = 'pointer';
    this.joystick.style.opacity = '0.7';
    container.appendChild(this.joystick);

    this.ctx = this.joystick.getContext('2d')!;
    this.baseX = this.joystick.width / 2;
    this.baseY = this.joystick.height / 2;

    this.joystick.addEventListener('touchstart', (e) => this.onTouchStart(e));
    this.joystick.addEventListener('touchmove', (e) => this.onTouchMove(e));
    this.joystick.addEventListener('touchend', (e) => this.onTouchEnd(e));
    this.joystick.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.joystick.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.joystick.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.joystick.addEventListener('mouseleave', (e) => this.onMouseUp(e));

    this.render();
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.joystick.getBoundingClientRect();
    this.touchX = touch.clientX - rect.left;
    this.touchY = touch.clientY - rect.top;
    this.touching = true;
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.touching) return;
    const touch = e.touches[0];
    const rect = this.joystick.getBoundingClientRect();
    this.touchX = touch.clientX - rect.left;
    this.touchY = touch.clientY - rect.top;
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.touching = false;
    this.touchX = this.baseX;
    this.touchY = this.baseY;
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.joystick.getBoundingClientRect();
    this.touchX = e.clientX - rect.left;
    this.touchY = e.clientY - rect.top;
    this.touching = true;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.touching) return;
    const rect = this.joystick.getBoundingClientRect();
    this.touchX = e.clientX - rect.left;
    this.touchY = e.clientY - rect.top;
  }

  private onMouseUp(e: MouseEvent): void {
    this.touching = false;
    this.touchX = this.baseX;
    this.touchY = this.baseY;
  }

  update(): MoveInput {
    const dx = this.touchX - this.baseX;
    const dy = this.touchY - this.baseY;
    const dist = Math.hypot(dx, dy);

    let ndx = 0;
    let ndz = 0;

    if (dist > this.deadzone) {
      const clamped = Math.min(dist, this.radius);
      ndx = (dx / dist) * (clamped / this.radius);
      ndz = (dy / dist) * (clamped / this.radius);
    }

    this.input = {
      dx: ndx,
      dz: ndz,
      run: false,
    };

    return this.input;
  }

  private render(): void {
    this.ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
    this.ctx.fillRect(0, 0, this.joystick.width, this.joystick.height);

    // Base circle
    this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(this.baseX, this.baseY, this.radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // Thumb
    const dx = this.touchX - this.baseX;
    const dy = this.touchY - this.baseY;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, this.radius);

    this.ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
    this.ctx.beginPath();
    if (dist > 0) {
      const tx = this.baseX + (dx / dist) * clamped;
      const ty = this.baseY + (dy / dist) * clamped;
      this.ctx.arc(tx, ty, 15, 0, Math.PI * 2);
    } else {
      this.ctx.arc(this.baseX, this.baseY, 15, 0, Math.PI * 2);
    }
    this.ctx.fill();

    requestAnimationFrame(() => this.render());
  }

  dispose(): void {
    this.container.removeChild(this.joystick);
  }
}

export class DPadInputSource implements InputSource {
  private container: HTMLElement;
  private buttons: Map<string, HTMLButtonElement> = new Map();
  private activeButtons: Set<string> = new Set();
  private readonly size = 40;
  private readonly gap = 10;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createUI();
  }

  private createUI(): void {
    const panel = document.createElement('div');
    panel.style.position = 'absolute';
    panel.style.bottom = '20px';
    panel.style.left = '20px';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = `${this.gap}px`;
    panel.style.opacity = '0.7';

    const dirs = [
      { label: '↑', key: 'forward', dx: 0, dz: 1 },
      { label: '↓', key: 'backward', dx: 0, dz: -1 },
      { label: '←', key: 'left', dx: -1, dz: 0 },
      { label: '→', key: 'right', dx: 1, dz: 0 },
    ];

    for (const dir of dirs) {
      const btn = document.createElement('button');
      btn.textContent = dir.label;
      btn.style.width = `${this.size}px`;
      btn.style.height = `${this.size}px`;
      btn.style.fontSize = '20px';
      btn.style.cursor = 'pointer';
      btn.style.userSelect = 'none';

      btn.addEventListener('mousedown', () => this.activeButtons.add(dir.key));
      btn.addEventListener('mouseup', () => this.activeButtons.delete(dir.key));
      btn.addEventListener('mouseleave', () => this.activeButtons.delete(dir.key));

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.activeButtons.add(dir.key);
      });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.activeButtons.delete(dir.key);
      });

      panel.appendChild(btn);
      this.buttons.set(dir.key, btn);
    }

    this.container.appendChild(panel);
  }

  update(): MoveInput {
    let dx = 0;
    let dz = 0;

    if (this.activeButtons.has('left')) dx -= 1;
    if (this.activeButtons.has('right')) dx += 1;
    if (this.activeButtons.has('forward')) dz += 1;
    if (this.activeButtons.has('backward')) dz -= 1;

    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }

    return { dx, dz, run: false };
  }

  dispose(): void {
    const panel = this.container.querySelector('div');
    if (panel) this.container.removeChild(panel);
  }
}

// ─────────────────────────────────────────────────────────────────
// Walk Controller
// ─────────────────────────────────────────────────────────────────

export class WalkController {
  private locomotionState: LocomotionState = {
    position: { x: 0, y: 0, z: 0 },
    facingY: 0,
    speed: 0,
    isMoving: false,
    isColliding: false,
  };

  constructor(
    private inputSource: InputSource,
    private physics: PhysicsWorldService,
    private cameraRelative = false
  ) {}

  update(dt: number, cameraFacingY: number = 0): LocomotionState {
    const input = this.inputSource.update();

    let vx = 0;
    let vz = 0;

    if (this.cameraRelative) {
      // Rotate input by camera facing
      const cos = Math.cos(cameraFacingY);
      const sin = Math.sin(cameraFacingY);
      const rx = input.dx * cos - input.dz * sin;
      const rz = input.dx * sin + input.dz * cos;
      input.dx = rx;
      input.dz = rz;
    }

    const speed = input.run ? RUN_SPEED : WALK_SPEED;
    const len = Math.hypot(input.dx, input.dz);

    if (len > 0.1) {
      vx = input.dx * speed;
      vz = input.dz * speed;
      this.locomotionState.facingY = Math.atan2(input.dx, input.dz);
    }

    this.physics.setPlayerVelocity(vx, vz);
    this.physics.step(dt);

    const pos = this.physics.getPlayerPosition();
    this.locomotionState.position = pos;
    this.locomotionState.speed = len * speed;
    this.locomotionState.isMoving = len > 0.1;

    return { ...this.locomotionState };
  }

  getLocomotionState(): LocomotionState {
    return { ...this.locomotionState };
  }

  setPosition(pos: Vec3): void {
    this.physics.setPlayerPosition(pos);
    this.locomotionState.position = pos;
  }

  dispose(): void {
    this.inputSource.dispose();
  }
}

// ─────────────────────────────────────────────────────────────────
// Locomotion Animator
// ─────────────────────────────────────────────────────────────────

export class WalkAnimator {
  private walkBlend = 0; // 0 = idle, 1 = walking
  private time = 0;
  private hipBaseY: number | null = null; // captured on first frame so bob is relative, never cumulative

  constructor(private avatar: THREE.Object3D) {}

  update(dt: number, locomotionState: LocomotionState): void {
    const targetBlend = locomotionState.isMoving ? 1 : 0;
    this.walkBlend = THREE.MathUtils.lerp(this.walkBlend, targetBlend, dt * 6.67); // 150ms blend
    this.time += dt;

    const hipBone = this.findBone(this.avatar, 'Hips');

    if (this.walkBlend < 0.01) {
      // Fully idle: ease the hip back to its rest offset rather than snapping,
      // so the last stride doesn't end on a visible pop.
      if (hipBone && this.hipBaseY !== null) {
        hipBone.position.y = THREE.MathUtils.lerp(hipBone.position.y, this.hipBaseY, dt * 6.67);
      }
      return;
    }

    // Procedural walk animation: hip sway ±3°, bob ±2cm, leg lean
    const cycleTime = 0.6; // walk cycle duration
    const phase = (this.time % cycleTime) / cycleTime;

    // Hip sway + vertical bob
    const hipSway = Math.sin(phase * Math.PI * 2) * 0.05 * this.walkBlend;
    const bob = Math.abs(Math.sin(phase * Math.PI)) * 0.02 * this.walkBlend;
    if (hipBone) {
      if (this.hipBaseY === null) this.hipBaseY = hipBone.position.y;
      hipBone.rotation.z = hipSway;
      hipBone.position.y = this.hipBaseY + bob;
    }

    // Leg lean (alternating)
    const legLean = Math.sin(phase * Math.PI * 2) * 0.1 * this.walkBlend;
    const leftLeg = this.findBone(this.avatar, 'LeftUpperLeg');
    const rightLeg = this.findBone(this.avatar, 'RightUpperLeg');

    if (leftLeg) leftLeg.rotation.z = -legLean;
    if (rightLeg) rightLeg.rotation.z = legLean;
  }

  private findBone(obj: THREE.Object3D, name: string): THREE.Object3D | null {
    if (obj.name === name) return obj;
    for (const child of obj.children) {
      const result = this.findBone(child, name);
      if (result) return result;
    }
    return null;
  }
}
