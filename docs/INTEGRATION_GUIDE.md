# V-Me Walkable Environment — Integration Guide

This guide shows how to integrate the walkable apartment system into the existing V-Me app (Angular/Three.js/MediaPipe).

---

## Architecture Overview

```
three-scene.service.ts (existing)
    ├── Scene graph, renderer, avatars
    └── NEW: EnvironmentService (M12)
            ├── PhysicsWorldService
            ├── WalkController + input
            ├── Camera rigs (Selfie/Placed/Director)
            └── EnvironmentStore

Avatar rendering (VRM/2D) + DriverMixer continue unchanged
Recording/output unchanged (both use Take Camera only)
```

---

## Integration Steps

### **Step 1: Wire EnvironmentService into three-scene.service.ts**

In `src/app/render/three-scene.service.ts`:

```typescript
import { EnvironmentService } from '../environment/environment.service';

export class ThreeSceneService {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private environmentService: EnvironmentService;

  constructor(
    // ... existing deps
  ) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.environmentService = new EnvironmentService(this.scene);
  }

  async init(): Promise<void> {
    // ... existing setup
    await this.environmentService.init();
    await this.environmentService.loadEnvironment('apartment-default');
  }

  update(dt: number): void {
    // ... existing code
    this.environmentService.update(dt);

    // Get locomotion state to feed into avatar rendering
    const locomotion = this.environmentService.getLocomotionState();
    this.updateAvatarPosition(locomotion); // see Step 2
  }

  dispose(): void {
    this.environmentService.dispose();
    // ... existing cleanup
  }
}
```

### **Step 2: Connect Locomotion to AvatarState (existing DriverMixer)**

The `LocomotionState.position` and `LocomotionState.facingY` feed into `AvatarState.bodyOffset` (already defined in Master Plan §3.4).

In `src/app/drivers/driver-mixer.ts`:

```typescript
export class DriverMixer {
  // ... existing code

  updateFromLocomotion(locomotion: LocomotionState): void {
    // Position offset from walking
    this.avatarState.bodyOffset.position = {
      ...this.avatarState.bodyOffset.position,
      x: locomotion.position.x,
      z: locomotion.position.z,
      // y (height) is NOT affected by walking; avatar stays at floor level
    };

    // Facing direction from input
    const rootBone = this.skeleton.getRootBone();
    if (rootBone) {
      rootBone.quaternion.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        locomotion.facingY
      );
    }
  }
}
```

### **Step 3: Inspector Tab for Environment Controls**

In `src/app/ui/inspector/environment-tab.component.ts` (new):

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { EnvironmentService, EnvironmentState } from '../../environment/environment.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-environment-tab',
  template: `
    <div class="inspector-tab environment-tab">
      <h3>Environment</h3>

      <!-- Rig Mode -->
      <div class="control-group">
        <label>Camera Rig</label>
        <button-group [(value)]="state.rigMode" (change)="onRigModeChange($event)">
          <button value="selfie">Selfie Cam</button>
          <button value="placed">Placed Cam</button>
        </button-group>
      </div>

      <!-- Selfie Cam Controls -->
      <ng-container *ngIf="state.rigMode === 'selfie'">
        <slider label="Arm Length" [value]="0.55" min="0.3" max="1" step="0.05"></slider>
        <slider label="Height Offset" [value]="-0.05" min="-0.3" max="0.3" step="0.05"></slider>
        <slider label="Tilt Sensitivity" [value]="0.6" min="0" max="1" step="0.1"></slider>
        <toggle label="Auto-Frame Face" checked></toggle>
        <toggle label="Synthetic Sway" checked></toggle>
        <button (click)="onCalibrateDeviceOrientation()">Recalibrate Tilt</button>
      </ng-container>

      <!-- Placed Cam Controls -->
      <ng-container *ngIf="state.rigMode === 'placed'">
        <div class="control-group">
          <label>Camera Stand</label>
          <select (change)="onCameraStandChange($event)">
            <option value="stand-tv">TV Stand</option>
            <option value="stand-kitchen">Kitchen Counter</option>
            <option value="stand-nightstand">Bedroom Nightstand</option>
            <option value="stand-bath-shelf">Bathroom Shelf</option>
            <option value="custom">Custom...</option>
          </select>
        </div>
        <slider label="FOV" [value]="60" min="30" max="90" step="5"></slider>
        <toggle label="Track Subject" (change)="onTrackSubjectChange($event)"></toggle>
        <button (click)="onPlaceCameraCustom()">Place Camera...</button>
      </ng-container>

      <!-- Movement Controls -->
      <div class="control-group">
        <label>Movement</label>
        <toggle label="Camera-Relative" (change)="onCameraRelativeChange($event)"></toggle>
        <toggle label="Simple Touch Controls" (change)="onDPadToggle($event)"></toggle>
      </div>

      <!-- Debug & Visibility -->
      <div class="control-group">
        <toggle label="Show Collision Boxes" (change)="onDebugCollisionChange($event)"></toggle>
        <toggle label="Show Ceiling" (change)="onCeilingChange($event)"></toggle>
      </div>

      <!-- Director View (non-recorded, navigation only) -->
      <div class="control-group">
        <button (click)="onToggleDirectorView()" class="primary">
          {{ state.isInDirectorView ? 'Back to Take View' : 'Director View (V)' }}
        </button>
        <p *ngIf="state.isInDirectorView" class="warning">
          ⚠ Navigation view — not recorded
        </p>
      </div>

      <!-- Quick Teleport (for testing) -->
      <div class="control-group">
        <label>Quick Jump</label>
        <button (click)="onTeleport('living')">Living Room</button>
        <button (click)="onTeleport('bedroom')">Bedroom</button>
        <button (click)="onTeleport('bathroom')">Bathroom</button>
      </div>
    </div>
  `,
  styles: [
    `
    .environment-tab { padding: 12px; }
    .control-group { margin-bottom: 16px; }
    .control-group label { display: block; font-weight: bold; margin-bottom: 4px; }
    .warning { color: #f97316; font-size: 12px; margin: 8px 0; }
    button { margin-right: 4px; }
    `
  ]
})
export class EnvironmentTabComponent implements OnInit, OnDestroy {
  state: EnvironmentState;
  private destroy$ = new Subject<void>();

  constructor(private environmentService: EnvironmentService) {}

  ngOnInit(): void {
    this.environmentService.getState()
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => (this.state = state));
  }

  onRigModeChange(mode: 'selfie' | 'placed'): void {
    this.environmentService.setCameraRigMode(mode);
  }

  onCameraStandChange(event: any): void {
    // TODO: update placed rig marker
  }

  onPlaceCameraCustom(): void {
    // TODO: enter drag-gizmo mode in Director View
  }

  onToggleDirectorView(): void {
    this.environmentService.toggleDirectorView();
  }

  onDebugCollisionChange(enabled: boolean): void {
    if (enabled) {
      this.environmentService.toggleCollisionDebug();
    }
  }

  onCeilingChange(enabled: boolean): void {
    this.environmentService.toggleCeiling();
  }

  onCameraRelativeChange(enabled: boolean): void {
    // TODO: update walk controller
  }

  onDPadToggle(enabled: boolean): void {
    // TODO: swap input source
  }

  onCalibrateDeviceOrientation(): void {
    // TODO: call deviceOrientation.calibrate()
  }

  onTeleport(room: string): void {
    const roomCenters: Record<string, [number, number, number]> = {
      living: [2.4, 1, 2.8],
      bedroom: [6.0, 1, 4.0],
      bathroom: [6.0, 1, 1.2],
    };
    const [x, y, z] = roomCenters[room];
    this.environmentService.teleportPlayer({ x, y, z });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### **Step 4: Handle Recording (No Changes)**

The existing `Recorder` continues to capture the main canvas. Since the Take Camera (not Director View) is always the active render camera during recording, no new recorder code is needed.

**Key rule:** Director View auto-reverts to Take View the instant Record is pressed (§19.4 in spec).

```typescript
// In recording.service.ts (existing code, no changes needed)
onRecord(): void {
  if (this.isInDirectorView) {
    this.environmentService.exitDirectorView(); // auto-revert
  }
  this.recorder.start(); // capture Take Camera as usual
}
```

### **Step 5: Device Tier Gating**

The app's existing `DeviceTierService` (Master Plan §13.4) already gates performance features. Wire it to environment budgets:

```typescript
// In three-scene.service.ts
async initEnvironment(): Promise<void> {
  const tier = this.deviceTierService.getCurrentTier();
  this.environmentService.setDeviceTier(tier);

  // Physics substeps, LOD variant, HDR toggle all follow from tier
  // See TIER_BUDGETS in 01-environment.models.ts
}
```

---

## File Organization

```
src/app/
├── environment/
│   ├── environment.models.ts              ← Data contracts
│   ├── apartment-builder.ts               ← Procedural builder
│   ├── physics-world.service.ts           ← cannon-es wrapper
│   ├── movement.controller.ts             ← Input + walk + animation
│   ├── camera-rigs.ts                     ← Selfie/Placed/Director
│   ├── environment.store.ts               ← Library & persistence
│   └── environment.service.ts             ← Main coordinator
├── ui/inspector/
│   └── environment-tab.component.ts       ← Inspector UI (NEW)
├── render/
│   └── three-scene.service.ts             ← Integrate environment.service
└── drivers/
    └── driver-mixer.ts                    ← Connect locomotion → avatar
```

---

## Key Integration Points

| System | Integration |
|--------|-------------|
| **Avatar Rendering** | `WalkAnimator` updates humanoid bones; `LocomotionState` feeds into `DriverMixer` |
| **Camera** | Take Camera rig output applied to main `THREE.PerspectiveCamera` each frame |
| **Recording** | Recorder captures Take Camera output; Director View auto-hidden |
| **Tracking** | Camera tracking (MediaPipe) continues to drive face; walking doesn't suspend it (§19.3) |
| **TTS/Audio** | Performance Modes work unchanged; walking is independent axis |
| **UI** | Inspector tab, hotkeys (V for Director View toggle), door interaction prompts |

---

## Testing Checklist

- [ ] Apartment loads procedurally (no GLB needed)
- [ ] Physics prevents clipping through walls/furniture
- [ ] Keyboard (W/A/S/D + Shift) and touch joystick both work
- [ ] Selfie Cam frames avatar face and reacts to device tilt (if gyro present)
- [ ] Placed Cam shows fixed frame; avatar walks in/out correctly
- [ ] Director View follow-cam works with pointer-lock on desktop
- [ ] V key toggles Director/Take view; never recorded
- [ ] All four Performance Modes (TTS/Live/Clip/Free) work while walking
- [ ] Recording captures only Take Camera, not Director View
- [ ] Door E key interaction works
- [ ] Low-tier device still runs (no new downgrade step)
- [ ] Blender GLB loads correctly when present, procedural fallback works otherwise

---

## Reference

- **Spec:** Environment Addendum §19 (full walkable environment)
- **Master Plan:** §3.4 (DriverMixer), §11.2 (Recorder), §13.4 (Device Tiers), §14.6 (UI)
- **M12 Tasks:** §19.14 (milestone breakdown)
