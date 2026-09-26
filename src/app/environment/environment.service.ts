/**
 * V-Me Environment Service
 * Central coordinator for apartment, physics, movement, and cameras.
 * Ref: Environment Addendum M12
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BehaviorSubject, Observable } from 'rxjs';

import {
  ApartmentDef,
  LocomotionState,
  RigMode,
  SelfieRigConfig,
  PlacedRigConfig,
  DeviceTier,
} from './environment.models';
import { ApartmentBuilder } from './apartment-builder';
import { PhysicsWorldService } from './physics-world.service';
import {
  WalkController,
  WalkAnimator,
  KeyboardInputSource,
  JoystickInputSource,
  DPadInputSource,
  InputSource,
} from '../movement/movement.controller';
import {
  CameraRig,
  SelfieRig,
  PlacedRig,
  DirectorCam,
  DeviceOrientationService,
} from '../camera-rig/camera-rigs';
import { EnvironmentStore } from './environment.store';

export interface EnvironmentState {
  apartment: ApartmentDef | null;
  isLoaded: boolean;
  rigMode: RigMode;
  showCollisionDebug: boolean;
  showCeiling: boolean;
  cameraRelativeMovement: boolean;
  useDpadControls: boolean;
  deviceTier: DeviceTier;
}

export class EnvironmentService {
  // State
  private state$ = new BehaviorSubject<EnvironmentState>({
    apartment: null,
    isLoaded: false,
    rigMode: 'selfie',
    showCollisionDebug: false,
    showCeiling: false,
    cameraRelativeMovement: false,
    useDpadControls: false,
    deviceTier: 'medium',
  });

  // Scene graph
  private scene: THREE.Scene;
  private apartmentRoot: THREE.Group | null = null;
  private debugGroup: THREE.Group | null = null;
  private mainCamera: THREE.PerspectiveCamera | null = null;

  // Systems
  private physics: PhysicsWorldService;
  private walkController: WalkController | null = null;
  private walkAnimator: WalkAnimator | null = null;
  private cameraRig: CameraRig | null = null;
  private directorCam: DirectorCam | null = null;
  private deviceOrientation: DeviceOrientationService;
  private store: EnvironmentStore;

  // State
  private locomotionState: LocomotionState = {
    position: { x: 0, y: 0, z: 0 },
    facingY: 0,
    speed: 0,
    isMoving: false,
    isColliding: false,
  };

  private isInDirectorView = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.physics = new PhysicsWorldService();
    this.deviceOrientation = new DeviceOrientationService();
    this.store = new EnvironmentStore();
  }

  async init(): Promise<void> {
    await this.store.init();
    await this.deviceOrientation.requestPermission();
  }

  async loadEnvironment(environmentId = 'apartment-default'): Promise<void> {
    const record = await this.store.getEnvironment(environmentId);
    if (!record) throw new Error(`Environment ${environmentId} not found`);

    // Load apartment definition
    let apartment: ApartmentDef;

    if (record.kind === 'procedural') {
      apartment = this.store.getProcedureDefinition(record.proceduralDefId || 'apartment-default')!;
    } else if (record.kind === 'glb' && record.blobKey) {
      // Try to load GLB (optional enhancement)
      try {
        apartment = await this.loadGLBEnvironment(record.blobKey);
      } catch (e) {
        console.warn(`Failed to load GLB, falling back to procedural: ${e}`);
        apartment = ApartmentBuilder.createDefaultApartment();
      }
    } else {
      apartment = ApartmentBuilder.createDefaultApartment();
    }

    // Clear old scene
    if (this.apartmentRoot) {
      this.scene.remove(this.apartmentRoot);
    }
    if (this.debugGroup) {
      this.scene.remove(this.debugGroup);
    }

    // Build scene
    const state = this.state$.getValue();
    this.apartmentRoot = ApartmentBuilder.buildThreeScene(apartment, state.showCeiling);
    this.scene.add(this.apartmentRoot);

    // Build physics
    this.physics.clearEnvironment();
    this.physics.buildApartmentColliders(apartment);

    // Create debug visualization
    this.debugGroup = this.physics.createDebugVisualization();
    this.debugGroup.visible = state.showCollisionDebug;
    this.scene.add(this.debugGroup);

    // Reset player position to spawn
    const spawnMarker = apartment.markers.find((m) => m.kind === 'spawn');
    if (spawnMarker) {
      this.physics.setPlayerPosition(spawnMarker.position);
    }

    // Update state
    this.state$.next({
      ...state,
      apartment,
      isLoaded: true,
    });

    console.log(`✓ Loaded environment: ${environmentId}`);
  }

  private async loadGLBEnvironment(blobKey: string): Promise<ApartmentDef> {
    // Full GLB parsing (mesh -> Trimesh colliders, §19.20.4) is a follow-up
    // enhancement; for now the procedural definition is authoritative for
    // collision/markers regardless of which visual asset is loaded.
    console.log(`GLB environment loading not yet implemented for blobKey: ${blobKey}; using procedural definition.`);
    return ApartmentBuilder.createDefaultApartment();
  }

  setupInputAndControls(
    containerElement: HTMLElement,
    avatarObject: THREE.Object3D,
    camera: THREE.PerspectiveCamera
  ): void {
    const state = this.state$.getValue();

    // Input source
    let inputSource: InputSource;
    if (state.useDpadControls) {
      inputSource = new DPadInputSource(containerElement);
    } else {
      // Default: keyboard + joystick
      inputSource = new KeyboardInputSource();
      new JoystickInputSource(containerElement); // runs in parallel
    }

    // Walk controller
    this.walkController = new WalkController(
      inputSource,
      this.physics,
      state.cameraRelativeMovement
    );

    // Walk animator
    this.walkAnimator = new WalkAnimator(avatarObject);

    // Camera rig (Selfie by default)
    this.createCameraRig(state.rigMode, camera);

    // Director cam
    this.directorCam = new DirectorCam(containerElement as HTMLCanvasElement, camera);

    // Keep a reference so update() can apply rig output to the real camera
    this.mainCamera = camera;
  }

  private createCameraRig(mode: RigMode, camera: THREE.PerspectiveCamera): void {
    const state = this.state$.getValue();
    const apartment = state.apartment!;

    if (mode === 'selfie') {
      const config: SelfieRigConfig = {
        armLength: 0.55,
        heightOffset: -0.05,
        deviceTiltGain: 0.6,
        syntheticSwayEnabled: true,
        autoFrame: 'face',
      };
      this.cameraRig = new SelfieRig(config, this.deviceOrientation);
    } else {
      const config: PlacedRigConfig = {
        markerId: 'stand-tv',
        fov: 60,
        trackSubject: false,
        trackSpeedDegPerSec: 25,
      };
      this.cameraRig = new PlacedRig(config, apartment.markers);
    }
  }

  update(dt: number): void {
    if (!this.walkController || !this.cameraRig) return;

    // Camera-relative movement steers by the take camera's current yaw;
    // world-relative movement (default) ignores it and passes 0.
    const state = this.state$.getValue();
    const cameraFacingY = state.cameraRelativeMovement && this.mainCamera
      ? new THREE.Euler().setFromQuaternion(this.mainCamera.quaternion, 'YXZ').y
      : 0;

    // Update movement
    this.locomotionState = this.walkController.update(dt, cameraFacingY);
    if (this.walkAnimator) {
      this.walkAnimator.update(dt, this.locomotionState);
    }

    // Update physics debug
    if (this.debugGroup && this.debugGroup.visible) {
      this.physics.updateDebugVisualization();
    }

    // Update camera — Director View is navigation-only and NEVER recorded;
    // recording code must call exitDirectorView() before starting a take (§19.4).
    if (this.isInDirectorView && this.directorCam) {
      this.directorCam.update(dt, this.locomotionState);
      const dirOutput = this.directorCam.getOutput();
      this.applyCameraOutput(dirOutput);
    } else if (this.mainCamera) {
      const output = this.cameraRig.update(dt, this.locomotionState);
      this.applyCameraOutput(output);
    }
  }

  private applyCameraOutput(output: { position: { x: number; y: number; z: number }; quaternion: { x: number; y: number; z: number; w: number }; fov: number }): void {
    if (!this.mainCamera) return;
    this.mainCamera.position.set(output.position.x, output.position.y, output.position.z);
    this.mainCamera.quaternion.set(output.quaternion.x, output.quaternion.y, output.quaternion.z, output.quaternion.w);
    if (this.mainCamera.fov !== output.fov) {
      this.mainCamera.fov = output.fov;
      this.mainCamera.updateProjectionMatrix();
    }
  }

  /**
   * Recording MUST call this before starting a take. Director View is
   * navigation-only and is never allowed to be the recorded frame (§19.4).
   */
  exitDirectorView(): void {
    this.isInDirectorView = false;
  }

  toggleDirectorView(): void {
    this.isInDirectorView = !this.isInDirectorView;
    console.log(`Director View: ${this.isInDirectorView ? 'ON' : 'OFF'}`);
  }

  toggleCollisionDebug(): void {
    const state = this.state$.getValue();
    const showCollisionDebug = !state.showCollisionDebug;
    if (this.debugGroup) {
      this.debugGroup.visible = showCollisionDebug;
    }
    this.state$.next({ ...state, showCollisionDebug });
  }

  toggleCeiling(): void {
    const state = this.state$.getValue();
    const showCeiling = !state.showCeiling;
    if (this.apartmentRoot) {
      const ceilings = this.apartmentRoot.children.filter((c) => c.name.startsWith('ceiling'));
      ceilings.forEach((c) => (c.visible = showCeiling));
    }
    this.state$.next({ ...state, showCeiling });
  }

  setCameraRigMode(mode: RigMode): void {
    const state = this.state$.getValue();
    if (state.rigMode === mode) return;

    this.state$.next({ ...state, rigMode: mode });

    // Recreate camera rig against the live camera, not a throwaway one —
    // otherwise the new rig's output is never applied to anything on screen.
    if (state.apartment && this.mainCamera) {
      this.createCameraRig(mode, this.mainCamera);
    }
  }

  setDeviceTier(tier: DeviceTier): void {
    const state = this.state$.getValue();
    this.state$.next({ ...state, deviceTier: tier });
    console.log(`Device tier set to: ${tier}`);
  }

  getState(): Observable<EnvironmentState> {
    return this.state$.asObservable();
  }

  getLocomotionState(): LocomotionState {
    return { ...this.locomotionState };
  }

  dispose(): void {
    this.walkController?.dispose();
    this.cameraRig?.dispose();
    this.directorCam?.dispose();
    this.physics.dispose();
    this.store.dispose();

    if (this.apartmentRoot) {
      this.scene.remove(this.apartmentRoot);
    }
    if (this.debugGroup) {
      this.scene.remove(this.debugGroup);
    }
  }
}
