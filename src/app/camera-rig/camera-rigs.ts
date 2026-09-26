/**
 * V-Me Camera Rig System
 * Selfie Cam, Placed Cam, and Director Cam implementations.
 * Ref: Environment Addendum §19.4, §19.8–19.9
 */

import * as THREE from 'three';
import {
  CameraRig,
  CameraRigOutput,
  RigMode,
  SelfieRigConfig,
  PlacedRigConfig,
  LocomotionState,
  MarkerPoint,
  Vec3,
  Quat,
} from '../environment/environment.models';

// Re-export so downstream modules (environment.service.ts) can import
// CameraRig directly from this file instead of reaching into environment.models.
export type { CameraRig, CameraRigOutput, RigMode, SelfieRigConfig, PlacedRigConfig };

// ─────────────────────────────────────────────────────────────────
// Device Orientation Service
// ─────────────────────────────────────────────────────────────────

export class DeviceOrientationService {
  private alpha = 0;
  private beta = 0;
  private gamma = 0;
  private calibratedAlpha = 0;
  private calibratedBeta = 0;
  private calibratedGamma = 0;
  private hasPermission = false;

  async requestPermission(): Promise<boolean> {
    if (typeof DeviceOrientationEvent === 'undefined') return false;

    // iOS 13+ requires explicit permission
    if (
      typeof (DeviceOrientationEvent as any).requestPermission === 'function'
    ) {
      try {
        const permission = await (
          DeviceOrientationEvent as any
        ).requestPermission();
        this.hasPermission = permission === 'granted';
      } catch (e) {
        return false;
      }
    } else {
      this.hasPermission = true;
    }

    if (this.hasPermission) {
      window.addEventListener('deviceorientation', (e) => {
        this.alpha = e.alpha || 0;
        this.beta = e.beta || 0;
        this.gamma = e.gamma || 0;
      });
    }

    return this.hasPermission;
  }

  calibrate(): void {
    this.calibratedAlpha = this.alpha;
    this.calibratedBeta = this.beta;
    this.calibratedGamma = this.gamma;
  }

  getDeltaEuler(): { alpha: number; beta: number; gamma: number } {
    return {
      alpha: this.alpha - this.calibratedAlpha,
      beta: this.beta - this.calibratedBeta,
      gamma: this.gamma - this.calibratedGamma,
    };
  }

  hasSupport(): boolean {
    return typeof DeviceOrientationEvent !== 'undefined';
  }
}

// ─────────────────────────────────────────────────────────────────
// Selfie Rig
// ─────────────────────────────────────────────────────────────────

export class SelfieRig implements CameraRig {
  readonly mode: RigMode = 'selfie';
  private config: SelfieRigConfig;
  private deviceOrientation: DeviceOrientationService;
  private time = 0;

  constructor(config: SelfieRigConfig, deviceOrientation?: DeviceOrientationService) {
    this.config = config;
    this.deviceOrientation = deviceOrientation || new DeviceOrientationService();
  }

  update(dt: number, avatar: LocomotionState): CameraRigOutput {
    this.time += dt;

    // Base position: selfie-stick pivot model
    const armForwardX = this.config.armLength * Math.sin(avatar.facingY);
    const armForwardZ = this.config.armLength * Math.cos(avatar.facingY);

    const position: Vec3 = {
      x: avatar.position.x + armForwardX,
      y: avatar.position.y + 1.6 + this.config.heightOffset, // eye level
      z: avatar.position.z + armForwardZ,
    };

    // Base orientation: aim at avatar face
    let lookTarget: Vec3 = {
      x: avatar.position.x,
      y: avatar.position.y + 1.7, // face height
      z: avatar.position.z,
    };

    if (this.config.autoFrame === 'upperBody') {
      lookTarget.y = avatar.position.y + 1.3;
    }

    const quat = this.lookAt(position, lookTarget);

    // Layer device tilt if available
    if (this.deviceOrientation.hasSupport()) {
      const delta = this.deviceOrientation.getDeltaEuler();
      const tiltQuat = new THREE.Quaternion();
      tiltQuat.setFromEuler(
        new THREE.Euler(
          (delta.beta * Math.PI) / 180 * this.config.deviceTiltGain,
          (delta.alpha * Math.PI) / 180 * this.config.deviceTiltGain,
          (delta.gamma * Math.PI) / 180 * this.config.deviceTiltGain
        )
      );
      const cameraQuat = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
      cameraQuat.multiplyQuaternions(cameraQuat, tiltQuat);
      return {
        position,
        quaternion: {
          x: cameraQuat.x,
          y: cameraQuat.y,
          z: cameraQuat.z,
          w: cameraQuat.w,
        },
        fov: 60,
      };
    }

    // Fallback: synthetic sway
    if (this.config.syntheticSwayEnabled) {
      const sway = Math.sin(this.time * 1.2) * 0.03;
      const speedBob = Math.abs(Math.sin(this.time * 3 * avatar.speed)) * 0.02 * avatar.speed;

      const swayQuat = new THREE.Quaternion();
      swayQuat.setFromEuler(new THREE.Euler(speedBob, sway, sway * 0.5));

      const cameraQuat = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);
      cameraQuat.multiplyQuaternions(cameraQuat, swayQuat);

      return {
        position,
        quaternion: {
          x: cameraQuat.x,
          y: cameraQuat.y,
          z: cameraQuat.z,
          w: cameraQuat.w,
        },
        fov: 60,
      };
    }

    return {
      position,
      quaternion: quat,
      fov: 60,
    };
  }

  private lookAt(from: Vec3, to: Vec3): Quat {
    const forward = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(up, forward).normalize();
    const actualUp = new THREE.Vector3().crossVectors(forward, right);

    const mat = new THREE.Matrix4();
    mat.makeBasis(right, actualUp, forward);
    const quat = new THREE.Quaternion();
    quat.setFromRotationMatrix(mat);

    return { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
  }

  dispose(): void {
    // no resources
  }
}

// ─────────────────────────────────────────────────────────────────
// Placed Rig
// ─────────────────────────────────────────────────────────────────

export class PlacedRig implements CameraRig {
  readonly mode: RigMode = 'placed';
  private config: PlacedRigConfig;
  private position: Vec3 = { x: 0, y: 0, z: 0 };
  private lookAt: Vec3 = { x: 0, y: 0, z: 0 };
  private currentYaw = 0;
  private currentPitch = 0;

  constructor(config: PlacedRigConfig, markers?: MarkerPoint[]) {
    this.config = config;
    if (config.markerId !== 'custom' && markers) {
      const marker = markers.find((m) => m.id === config.markerId);
      if (marker) {
        this.position = marker.position;
        this.lookAt = marker.lookAt;
      }
    } else if (config.customPosition) {
      this.position = config.customPosition;
      this.lookAt = config.customLookAt || { x: 0, y: 0, z: 0 };
    }

    this.updateYawPitch();
  }

  update(dt: number, avatar: LocomotionState): CameraRigOutput {
    if (this.config.trackSubject) {
      // Auto-track avatar
      const toAvatar = {
        x: avatar.position.x - this.position.x,
        y: avatar.position.y - this.position.y,
        z: avatar.position.z - this.position.z,
      };

      const targetYaw = Math.atan2(toAvatar.x, toAvatar.z);
      const targetPitch = Math.atan2(toAvatar.y, Math.hypot(toAvatar.x, toAvatar.z));

      const trackSpeed = (this.config.trackSpeedDegPerSec * Math.PI) / 180;
      this.currentYaw = this.lerpAngle(this.currentYaw, targetYaw, trackSpeed * dt);
      this.currentPitch = THREE.MathUtils.clamp(
        this.lerpAngle(this.currentPitch, targetPitch, trackSpeed * dt),
        -Math.PI / 3,
        Math.PI / 3
      );
    }

    const quat = this.createQuaternion();
    return {
      position: this.position,
      quaternion: quat,
      fov: this.config.fov,
    };
  }

  private updateYawPitch(): void {
    const forward = {
      x: this.lookAt.x - this.position.x,
      y: this.lookAt.y - this.position.y,
      z: this.lookAt.z - this.position.z,
    };

    this.currentYaw = Math.atan2(forward.x, forward.z);
    const h = Math.hypot(forward.x, forward.z);
    this.currentPitch = Math.atan2(forward.y, h);
  }

  private createQuaternion(): Quat {
    const euler = new THREE.Euler(this.currentPitch, this.currentYaw, 0, 'YXZ');
    const quat = new THREE.Quaternion();
    quat.setFromEuler(euler);
    return { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * Math.min(t, 1);
  }

  setCustomPosition(pos: Vec3, lookAt: Vec3): void {
    this.position = pos;
    this.lookAt = lookAt;
    this.updateYawPitch();
  }

  dispose(): void {
    // no resources
  }
}

// ─────────────────────────────────────────────────────────────────
// Director Cam (Navigation only, never recorded)
// ─────────────────────────────────────────────────────────────────

export class DirectorCam {
  private yawObj: THREE.Object3D = new THREE.Object3D();
  private pitchObj: THREE.Object3D = new THREE.Object3D();
  private camera: THREE.PerspectiveCamera;
  private pointerLocked = false;
  private yaw = 0;
  private pitch = 0;

  private readonly canvas: HTMLCanvasElement;
  private readonly onClick = () => this.requestPointerLock(this.canvas);
  private readonly onPointerLockChangeBound = () => this.onPointerLockChange();
  private readonly onMouseMoveBound = (e: MouseEvent) => this.onMouseMove(e);
  private readonly onKeyDownBound = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.releasePointerLock();
  };

  constructor(canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.canvas = canvas;

    // Create hierarchy: yaw -> pitch -> camera
    this.yawObj.add(this.pitchObj);
    this.pitchObj.add(camera);
    camera.position.z = 0;

    canvas.addEventListener('click', this.onClick);
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
    document.addEventListener('mousemove', this.onMouseMoveBound);
    document.addEventListener('keydown', this.onKeyDownBound);
  }

  private requestPointerLock(canvas: HTMLCanvasElement): void {
    (canvas as any).requestPointerLock =
      (canvas as any).requestPointerLock ||
      (canvas as any).mozRequestPointerLock;
    (canvas as any).requestPointerLock();
  }

  private releasePointerLock(): void {
    (document as any).exitPointerLock =
      (document as any).exitPointerLock || (document as any).mozExitPointerLock;
    (document as any).exitPointerLock();
  }

  private onPointerLockChange(): void {
    this.pointerLocked =
      (document as any).pointerLockElement !== null ||
      (document as any).mozPointerLockElement !== null;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.pointerLocked) return;

    const sensitivity = 0.005;
    this.yaw -= e.movementX * sensitivity;
    this.pitch -= e.movementY * sensitivity;

    // Clamp pitch to ±60°
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 3, Math.PI / 3);

    this.updateOrientation();
  }

  private updateOrientation(): void {
    this.yawObj.rotation.y = this.yaw;
    this.pitchObj.rotation.x = this.pitch;
  }

  update(dt: number, avatar: LocomotionState): void {
    // Position behind/above avatar
    const distance = 3;
    const height = 1.5;

    const x = avatar.position.x - Math.sin(avatar.facingY) * distance;
    const y = avatar.position.y + height;
    const z = avatar.position.z - Math.cos(avatar.facingY) * distance;

    this.yawObj.position.set(x, y, z);
  }

  getOutput(): { position: Vec3; quaternion: Quat; fov: number } {
    return {
      position: {
        x: this.yawObj.position.x,
        y: this.yawObj.position.y,
        z: this.yawObj.position.z,
      },
      quaternion: {
        x: this.camera.quaternion.x,
        y: this.camera.quaternion.y,
        z: this.camera.quaternion.z,
        w: this.camera.quaternion.w,
      },
      fov: this.camera.fov,
    };
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  dispose(): void {
    this.releasePointerLock();
    this.canvas.removeEventListener('click', this.onClick);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
    document.removeEventListener('mousemove', this.onMouseMoveBound);
    document.removeEventListener('keydown', this.onKeyDownBound);
  }
}
