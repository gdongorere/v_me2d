/**
 * V-Me Environment Module — Data Contracts
 * Authoritative TypeScript interfaces for the walkable apartment system.
 * Ref: Environment Addendum §19.6, §19.10
 */

export type Vec2 = { x: number; z: number };
export type Vec3 = { x: number; y: number; z: number };
export type Quat = { x: number; y: number; z: number; w: number };

// ─────────────────────────────────────────────────────────────────
// Environment: Geometry & Collision
// ─────────────────────────────────────────────────────────────────

export interface ColliderBox {
  id: string;
  center: Vec3;
  halfExtents: Vec3;
  rotationY: number; // radians; Y-rotation only in v1
}

export interface RoomDef {
  id: string;
  name: string;
  bounds: ColliderBox;
  floorMaterialId: string;
  ceilingHeight: number;
}

export interface WallOpening {
  kind: 'doorway' | 'door' | 'window';
  from: number; // distance along wall from start point (metres)
  to: number;
  sillHeight?: number;
  doorId?: string;
}

export interface WallSegment {
  id: string;
  roomIds: [string, string?];
  from: Vec2;
  to: Vec2;
  thickness: number;
  height: number;
  openings: WallOpening[];
}

export interface DoorDef {
  id: string;
  wallOpeningId: string;
  hinge: 'left' | 'right';
  openAngleDeg: number;
  startsOpen: boolean;
}

export interface FurnitureDef {
  id: string;
  name: string;
  roomId: string;
  visual: {
    shape: 'box' | 'cylinder' | 'compound';
    size: Vec3;
    position: Vec3;
    rotationY: number;
    colorHex: string;
    materialHint?: 'wood' | 'fabric' | 'metal' | 'glass' | 'ceramic';
  };
  decorative?: boolean; // true = no collider (rugs, wall art)
}

export interface MarkerPoint {
  id: string;
  kind: 'spawn' | 'camera-stand';
  roomId: string;
  position: Vec3;
  lookAt: Vec3;
  label: string;
}

export interface LightDef {
  id: string;
  type: 'hemisphere' | 'directional' | 'point';
  position?: Vec3;
  target?: Vec3;
  intensity: number;
  color?: string;
}

export interface ApartmentDef {
  id: string;
  name: string;
  rooms: RoomDef[];
  walls: WallSegment[];
  doors: DoorDef[];
  furniture: FurnitureDef[];
  markers: MarkerPoint[];
  lights: LightDef[];
}

// ─────────────────────────────────────────────────────────────────
// Movement
// ─────────────────────────────────────────────────────────────────

export interface MoveInput {
  dx: number; // normalized -1..1, world or avatar-relative per settings
  dz: number;
  run: boolean;
}

export interface LocomotionState {
  position: Vec3;
  facingY: number; // radians
  speed: number; // m/s
  isMoving: boolean;
  isColliding: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Camera Rig
// ─────────────────────────────────────────────────────────────────

export type RigMode = 'selfie' | 'placed';

export interface CameraRigOutput {
  position: Vec3;
  quaternion: Quat;
  fov: number;
}

export interface CameraRig {
  readonly mode: RigMode;
  update(dt: number, avatar: LocomotionState): CameraRigOutput;
  dispose(): void;
}

export interface SelfieRigConfig {
  armLength: number;
  heightOffset: number;
  deviceTiltGain: number;
  syntheticSwayEnabled: boolean;
  autoFrame: 'face' | 'upperBody';
}

export interface PlacedRigConfig {
  markerId: string | 'custom';
  customPosition?: Vec3;
  customLookAt?: Vec3;
  fov: number;
  trackSubject: boolean;
  trackSpeedDegPerSec: number;
}

// ─────────────────────────────────────────────────────────────────
// Environment Library
// ─────────────────────────────────────────────────────────────────

export interface EnvironmentRecord {
  id: string;
  name: string;
  kind: 'procedural' | 'glb';
  source: 'bundled' | 'imported';
  blobKey?: string; // IndexedDB key for GLB
  proceduralDefId?: string; // which ApartmentDef to build
  thumbnail?: string; // data URL
  meta: {
    author?: string;
    licence?: string;
    commercialUse?: boolean;
    roomCount: number;
    areaM2: number;
  };
  capabilities: {
    walkable: boolean;
    hasCollision: boolean;
    markerCount: number;
    lodVariants: ('full' | 'low')[];
  };
  markers: MarkerPoint[];
  added: number; // timestamp
}

// ─────────────────────────────────────────────────────────────────
// Device Tiers
// ─────────────────────────────────────────────────────────────────

export type DeviceTier = 'low' | 'medium' | 'high';

export interface EnvironmentTierBudget {
  environmentDrawCalls: number;
  environmentTriangles: number;
  textureResolutionCap: number;
  physicsBodies: number;
  physicsSubsteps: number;
  shadowCastingLights: number;
  ceilingRendered: boolean;
  hdrEnvironmentMap: boolean;
  targetFps: number;
}

export const TIER_BUDGETS: Record<DeviceTier, EnvironmentTierBudget> = {
  low: {
    environmentDrawCalls: 25,
    environmentTriangles: 15000,
    textureResolutionCap: 512,
    physicsBodies: 15,
    physicsSubsteps: 4,
    shadowCastingLights: 0,
    ceilingRendered: false,
    hdrEnvironmentMap: false,
    targetFps: 24,
  },
  medium: {
    environmentDrawCalls: 45,
    environmentTriangles: 40000,
    textureResolutionCap: 1024,
    physicsBodies: 25,
    physicsSubsteps: 8,
    shadowCastingLights: 1,
    ceilingRendered: false,
    hdrEnvironmentMap: false,
    targetFps: 30,
  },
  high: {
    environmentDrawCalls: 70,
    environmentTriangles: 120000,
    textureResolutionCap: 2048,
    physicsBodies: 25,
    physicsSubsteps: 10,
    shadowCastingLights: 3,
    ceilingRendered: true,
    hdrEnvironmentMap: true,
    targetFps: 60,
  },
};
