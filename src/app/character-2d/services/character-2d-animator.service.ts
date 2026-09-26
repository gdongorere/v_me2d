/**
 * V-Me 2D Character Animator Service — CORRECTED for the real data shapes
 * this project actually produces (verified against app.component.ts).
 *
 * Input shapes (from PoseBridgeService.getSnapshot()):
 *  - poseRotations: Kalidokit Pose.solve() output. Keyed by VRM bone name
 *    (Hips, Spine, LeftUpperArm, LeftLowerArm, LeftHand, RightUpperArm,
 *    RightLowerArm, RightHand, LeftUpperLeg, LeftLowerLeg, LeftFoot,
 *    RightUpperLeg, RightLowerLeg, RightFoot). Each value is a plain
 *    Euler rotation {x,y,z} in radians (NOT a quaternion). This mirrors
 *    exactly how src/app/app.component.ts already consumes this object
 *    (see its `for (const [boneName, targetEuler] of Object.entries(...))`
 *    loop) — z is the primary swing axis for arms (confirmed by the
 *    existing rest-pose fallback: LeftUpperArm.z = 1.25 for "arm hanging
 *    down"), x is the primary flex axis for legs.
 *  - faceData: Kalidokit Face.solve() output — { head:{x,y,z}, eye:{l,r},
 *    mouth:{x,y,shape:{A,E,I,O,U}}, brow, pupil:{x,y} }.
 *  - blendshapes: raw MediaPipe ARKit blendshape scores 0-1, e.g.
 *    "jawOpen", "mouthSmileLeft", "mouthSmileRight", "eyeBlinkLeft",
 *    "eyeBlinkRight", "browInnerUp", "browDownLeft", "browDownRight",
 *    "eyeWideLeft", "eyeWideRight", "mouthFrownLeft", "cheekPuff", etc.
 *    This is the SAME dictionary app.component.ts already builds as
 *    `this.targetBlendshapes` and is more reliable than re-deriving
 *    expressions from raw landmark distances, so it is used as the
 *    primary source here.
 */

import { Injectable } from '@angular/core';
import { BodyTransforms, FacialExpressions, Transform2D, AnimationFrame, Character2D } from '../models/character-2d.models';
import { PoseSnapshot } from './pose-bridge.service';

const RAD2CANVAS = 60; // px of limb-tip travel per radian, tuned for an 800x1000 canvas

@Injectable({
  providedIn: 'root',
})
export class Character2DAnimatorService {
  private blinkTimer = 0;
  private isBlinking = false;
  private blinkDuration = 100;
  private lastAnimationTime = 0;

  private idleBreathingPhase = 0;
  private idleSwayPhase = 0;
  private idleFidgetPhase = 0;
  private idleBouncePhase = 0;

  private lastHipY = 0;
  private movingSmoothed = 0;

  /**
   * Main entry point. `snapshot` is a PoseBridgeService.PoseSnapshot
   * (or, in creator/preview mode, `null` — see getStandingPose()).
   */
  animate(
    character: Character2D,
    snapshot: PoseSnapshot | any,
    _unusedLandmarks: any,
    deltaTime: number = 16
  ): AnimationFrame {
    this.lastAnimationTime += deltaTime;

    const poseRotations = snapshot?.poseRotations ?? snapshot ?? {};
    const faceData = snapshot?.faceData ?? null;
    const blendshapes = snapshot?.blendshapes ?? {};

    const bodyTransforms = this.convertPoseTo2D(poseRotations, character);
    const expressions = this.extractExpressions(blendshapes, faceData);

    if (!this.isMoving(poseRotations)) {
      this.applyIdleAnimation(bodyTransforms, character, deltaTime);
    }

    this.updateBlinkState(expressions, character, deltaTime);

    return { bodyTransforms, expressions, timestamp: this.lastAnimationTime };
  }

  // ─────────────────────────────────────────────────────────────────
  // Pose conversion: Kalidokit VRM-bone Euler → 2D screen transforms
  // ─────────────────────────────────────────────────────────────────

  private convertPoseTo2D(
    pose: Record<string, any>,
    character: Character2D
  ): BodyTransforms {
    const t = (rot: { x: number; y: number; z: number } | undefined, axis: 'x' | 'y' | 'z' = 'z'): number =>
      rot && typeof rot[axis] === 'number' && !isNaN(rot[axis]) ? rot[axis] : 0;

    // Hips can arrive either as a flat {x,y,z} (this codebase's Object.entries
    // loop treats every bone uniformly) or as Kalidokit's richer
    // {position, rotation, worldPosition} shape — handle both defensively.
    const hipsRaw = pose['Hips'];
    const hipsRot = hipsRaw?.rotation ?? hipsRaw ?? { x: 0, y: 0, z: 0 };
    const spine = pose['Spine'] ?? { x: 0, y: 0, z: 0 };

    const leftUpperArm = pose['LeftUpperArm'] ?? { x: 0, y: 0, z: 1.25 };
    const rightUpperArm = pose['RightUpperArm'] ?? { x: 0, y: 0, z: -1.25 };
    const leftLowerArm = pose['LeftLowerArm'] ?? { x: 0, y: 0, z: 0 };
    const rightLowerArm = pose['RightLowerArm'] ?? { x: 0, y: 0, z: 0 };
    const leftHand = pose['LeftHand'] ?? { x: 0, y: 0, z: 0 };
    const rightHand = pose['RightHand'] ?? { x: 0, y: 0, z: 0 };

    const leftUpperLeg = pose['LeftUpperLeg'] ?? { x: 0, y: 0, z: 0 };
    const rightUpperLeg = pose['RightUpperLeg'] ?? { x: 0, y: 0, z: 0 };
    const leftLowerLeg = pose['LeftLowerLeg'] ?? { x: 0, y: 0, z: 0 };
    const rightLowerLeg = pose['RightLowerLeg'] ?? { x: 0, y: 0, z: 0 };

    const heightScale = character.base.height || 1;

    const spineLeanX = t(spine, 'x') * RAD2CANVAS * 0.5; // forward/back lean → vertical squash
    const spineSwayY = t(spine, 'y') * RAD2CANVAS; // twist → horizontal shift
    const spineRoll = t(spine, 'z'); // side lean → rotation

    const mk = (position: { x: number; y: number }, rotation: number, scale = 1): Transform2D => ({
      position,
      rotation,
      scale,
    });

    return {
      head: mk(
        { x: spineSwayY * 0.6, y: -260 * heightScale + spineLeanX },
        t(hipsRot, 'y') * 0.4, // subtle head-follows-hip twist; real head look comes from faceData below in the renderer via eyeDirection
        heightScale
      ),
      torso: mk({ x: spineSwayY, y: spineLeanX }, spineRoll, heightScale),
      leftArm: mk(
        { x: -RAD2CANVAS * 0.3, y: 20 },
        t(leftUpperArm, 'z'),
        heightScale
      ),
      rightArm: mk(
        { x: RAD2CANVAS * 0.3, y: 20 },
        t(rightUpperArm, 'z'),
        heightScale
      ),
      leftLeg: mk(
        { x: -20 * heightScale, y: 160 * heightScale },
        -t(leftUpperLeg, 'x'),
        heightScale
      ),
      rightLeg: mk(
        { x: 20 * heightScale, y: 160 * heightScale },
        -t(rightUpperLeg, 'x'),
        heightScale
      ),
      leftHand: mk(
        {
          x: -RAD2CANVAS * 0.3 + t(leftLowerArm, 'z') * 20,
          y: 120,
        },
        t(leftHand, 'z'),
        0.8
      ),
      rightHand: mk(
        {
          x: RAD2CANVAS * 0.3 + t(rightLowerArm, 'z') * 20,
          y: 120,
        },
        t(rightHand, 'z'),
        0.8
      ),
      neck: mk({ x: spineSwayY * 0.8, y: spineLeanX - 40 }, spineRoll * 0.5, 1),
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Facial expressions: ARKit blendshapes (primary) + Kalidokit face (fallback)
  // ─────────────────────────────────────────────────────────────────

  private extractExpressions(
    blendshapes: Record<string, number>,
    faceData: any
  ): FacialExpressions {
    const b = (name: string): number => {
      const v = blendshapes?.[name];
      return typeof v === 'number' && !isNaN(v) ? v : 0;
    };

    const hasBlendshapes = blendshapes && Object.keys(blendshapes).length > 0;

    if (!hasBlendshapes && !faceData) {
      return this.getDefaultExpressions();
    }

    // Blend-shape driven values (0-1, direct from MediaPipe — most reliable)
    const eyeBlinkLeft = b('eyeBlinkLeft');
    const eyeBlinkRight = b('eyeBlinkRight');
    const jawOpen = b('jawOpen');
    const smileL = b('mouthSmileLeft');
    const smileR = b('mouthSmileRight');
    const frownL = b('mouthFrownLeft');
    const frownR = b('mouthFrownRight');
    const browInnerUp = b('browInnerUp');
    const browDownL = b('browDownLeft');
    const browDownR = b('browDownRight');
    const browOuterUpL = b('browOuterUpLeft');
    const browOuterUpR = b('browOuterUpRight');
    const eyeWideL = b('eyeWideLeft');
    const eyeWideR = b('eyeWideRight');
    const cheekPuff = b('cheekPuff');
    const noseSneerL = b('noseSneerLeft');
    const noseSneerR = b('noseSneerRight');
    const tongueOut = b('tongueOut');
    const jawClenchRaw = b('mouthPressLeft') + b('mouthPressRight');
    const mouthFunnel = b('mouthFunnel');
    const eyeLookInL = b('eyeLookInLeft');
    const eyeLookOutL = b('eyeLookOutLeft');
    const eyeLookUpL = b('eyeLookUpLeft');
    const eyeLookDownL = b('eyeLookDownLeft');

    // Fallback to Kalidokit Face.solve() shape if blendshapes are absent
    // (e.g. outputFaceBlendshapes disabled, or an older MediaPipe build).
    const fallbackEyeOpen = faceData?.eye ? { l: faceData.eye.l ?? 1, r: faceData.eye.r ?? 1 } : { l: 1, r: 1 };
    const fallbackMouthOpen = faceData?.mouth?.y ?? 0;
    const fallbackMouthWidth = faceData?.mouth?.x ?? 0.5;
    const fallbackPupilX = faceData?.pupil?.x ?? 0;
    const fallbackPupilY = faceData?.pupil?.y ?? 0;

    return {
      browHeight: {
        left: hasBlendshapes ? browInnerUp * 0.6 + browOuterUpL * 0.4 - browDownL : (faceData?.brow ?? 0),
        right: hasBlendshapes ? browInnerUp * 0.6 + browOuterUpR * 0.4 - browDownR : (faceData?.brow ?? 0),
      },
      eyeOpeness: {
        left: hasBlendshapes ? Math.max(0, 1 - eyeBlinkLeft) : fallbackEyeOpen.l,
        right: hasBlendshapes ? Math.max(0, 1 - eyeBlinkRight) : fallbackEyeOpen.r,
      },
      eyeDirection: {
        x: hasBlendshapes ? (eyeLookOutL - eyeLookInL) : fallbackPupilX,
        y: hasBlendshapes ? (eyeLookUpL - eyeLookDownL) : fallbackPupilY,
      },
      mouthOpenness: hasBlendshapes ? Math.min(1, jawOpen) : Math.min(1, fallbackMouthOpen),
      mouthWidth: hasBlendshapes ? 0.5 + (smileL + smileR) * 0.3 : fallbackMouthWidth,
      cheekPuff,
      jawClench: Math.min(1, jawClenchRaw),
      noseWrinkle: Math.max(noseSneerL, noseSneerR),
      tongueOut,
      smile: Math.min(1, (smileL + smileR) * 0.6),
      frown: Math.min(1, (frownL + frownR) * 0.6),
      surprise: Math.min(1, (browInnerUp + eyeWideL + eyeWideR) / 2.5 + mouthFunnel * 0.3),
      angry: Math.min(1, (browDownL + browDownR) / 1.6),
      sadness: Math.min(1, (frownL + frownR) / 1.6 + browInnerUp * 0.2),
      disgust: Math.max(noseSneerL, noseSneerR),
      fear: Math.min(1, (eyeWideL + eyeWideR) / 2),
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Movement detection (drives idle animation on/off)
  // ─────────────────────────────────────────────────────────────────

  private isMoving(pose: Record<string, any>): boolean {
    const hipsRaw = pose['Hips'];
    const hipY = hipsRaw?.position?.y ?? hipsRaw?.y ?? 0;
    const velocity = Math.abs(hipY - this.lastHipY);
    this.lastHipY = hipY;
    this.movingSmoothed = this.movingSmoothed * 0.8 + velocity * 0.2;
    return this.movingSmoothed > 0.01;
  }

  // ─────────────────────────────────────────────────────────────────
  // Idle animations (unchanged logic, still operates on BodyTransforms)
  // ─────────────────────────────────────────────────────────────────

  private applyIdleAnimation(transforms: BodyTransforms, character: Character2D, deltaTime: number): void {
    switch (character.animationStyle.idle || 'breathing') {
      case 'breathing':
        this.idleBreathingPhase += deltaTime * 0.003;
        transforms.torso.position.y += Math.sin(this.idleBreathingPhase) * 2;
        break;
      case 'sway':
        this.idleSwayPhase += deltaTime * 0.002;
        {
          const sway = Math.sin(this.idleSwayPhase) * 3;
          transforms.torso.position.x += sway;
          transforms.head.rotation += sway * 0.02;
        }
        break;
      case 'fidget':
        this.idleFidgetPhase += deltaTime;
        if (this.idleFidgetPhase > 2000) {
          const fidget = (Math.random() - 0.5) * 10;
          transforms.leftArm.position.y += fidget;
          transforms.rightArm.position.y += fidget;
          this.idleFidgetPhase = 0;
        }
        break;
      case 'bounce':
        this.idleBouncePhase += deltaTime * 0.005;
        transforms.torso.position.y += Math.sin(this.idleBouncePhase) * 5;
        break;
      case 'static':
      default:
        break;
    }
  }

  private updateBlinkState(expressions: FacialExpressions, character: Character2D, deltaTime: number): void {
    // If real blink data is already driving eyeOpeness (blendshapes present),
    // don't fight it with a synthetic blink timer — only simulate blinking
    // when we have no tracking data at all (i.e. eyeOpeness stuck at 1,1
    // because getDefaultExpressions() was used, meaning creator/no-camera mode).
    const looksUntracked = expressions.eyeOpeness.left === 1 && expressions.eyeOpeness.right === 1;
    if (!looksUntracked) return;

    const blinkFrequency = character.animationStyle.blink.frequency || 17;
    const blinkInterval = (60 / blinkFrequency) * 1000;
    this.blinkTimer += deltaTime;

    if (this.blinkTimer > blinkInterval && !this.isBlinking) {
      this.isBlinking = true;
      this.blinkTimer = 0;
    }

    if (this.isBlinking) {
      if (this.blinkTimer > this.blinkDuration) {
        this.isBlinking = false;
        this.blinkTimer = 0;
      } else {
        const progress = this.blinkTimer / this.blinkDuration;
        const amount = Math.sin(progress * Math.PI);
        expressions.eyeOpeness.left = Math.max(0, 1 - amount);
        expressions.eyeOpeness.right = Math.max(0, 1 - amount);
      }
    }
  }

  private getDefaultExpressions(): FacialExpressions {
    return {
      browHeight: { left: 0, right: 0 },
      eyeOpeness: { left: 1, right: 1 },
      eyeDirection: { x: 0, y: 0 },
      mouthOpenness: 0,
      mouthWidth: 0.5,
      cheekPuff: 0,
      jawClench: 0,
      noseWrinkle: 0,
      tongueOut: 0,
      smile: 0,
      frown: 0,
      surprise: 0,
      angry: 0,
      sadness: 0,
      disgust: 0,
      fear: 0,
    };
  }

  /**
   * Static standing pose used by the Character Creator preview (no camera
   * needed). Shape matches what convertPoseTo2D() expects: a flat map of
   * VRM bone name → Euler {x,y,z} radians (same as PoseSnapshot.poseRotations).
   */
  getStandingPose(): { poseRotations: Record<string, any>; faceData: any; blendshapes: Record<string, number> } {
    return {
      poseRotations: {
        Hips: { x: 0, y: 0, z: 0 },
        Spine: { x: 0, y: 0, z: 0 },
        LeftUpperArm: { x: 0, y: 0, z: 1.15 },
        RightUpperArm: { x: 0, y: 0, z: -1.15 },
        LeftLowerArm: { x: 0, y: 0, z: 0.1 },
        RightLowerArm: { x: 0, y: 0, z: -0.1 },
        LeftHand: { x: 0, y: 0, z: 0 },
        RightHand: { x: 0, y: 0, z: 0 },
        LeftUpperLeg: { x: 0, y: 0, z: 0 },
        RightUpperLeg: { x: 0, y: 0, z: 0 },
        LeftLowerLeg: { x: 0, y: 0, z: 0 },
        RightLowerLeg: { x: 0, y: 0, z: 0 },
      },
      faceData: null,
      blendshapes: {},
    };
  }
}
