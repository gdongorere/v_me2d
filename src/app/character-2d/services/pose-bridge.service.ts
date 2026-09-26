/**
 * V-Me Pose Bridge Service
 *
 * WHY THIS FILE EXISTS:
 * Your existing AppComponent already does all the hard motion-capture work:
 * it calls Kalidokit.Face.solve() and Kalidokit.Pose.solve() on the raw
 * MediaPipe results and stores the output in three private fields:
 *   - this.targetPoseRotations   (Kalidokit Pose.solve output — VRM bone
 *                                  names like LeftUpperArm, each a plain
 *                                  {x,y,z} Euler rotation in radians)
 *   - this.targetFaceData        (Kalidokit Face.solve output — head Euler,
 *                                  eye openness, mouth shape, brow, pupil)
 *   - this.targetBlendshapes     (raw MediaPipe ARKit blendshape scores,
 *                                  0-1, keyed by name like "jawOpen",
 *                                  "mouthSmileLeft", "eyeBlinkLeft", etc.)
 *
 * These are private component fields, not exposed anywhere else. Rather
 * than restructuring your 1000+ line AppComponent (risky), this service
 * is a tiny pass-through: AppComponent pushes a snapshot into it once per
 * frame (one line added at the existing insertion point), and the new
 * Character2DDisplayComponent pulls the latest snapshot every animation
 * frame. No behavior of the existing 3D/VRM pipeline changes.
 */

import { Injectable } from '@angular/core';

export interface PoseSnapshot {
  /** Kalidokit Pose.solve() output, keyed by VRM bone name. */
  poseRotations: Record<string, { x: number; y: number; z: number }>;
  /** Kalidokit Face.solve() output (head/eye/mouth/brow/pupil). */
  faceData: any;
  /** Raw MediaPipe ARKit blendshape scores, 0-1, keyed by name. */
  blendshapes: Record<string, number>;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class PoseBridgeService {
  private latest: PoseSnapshot = {
    poseRotations: {},
    faceData: null,
    blendshapes: {},
    timestamp: 0,
  };

  /** Called once per tracking frame from AppComponent. */
  update(
    poseRotations: Record<string, any>,
    faceData: any,
    blendshapes: Record<string, number>
  ): void {
    this.latest = {
      poseRotations: poseRotations || {},
      faceData: faceData || null,
      blendshapes: blendshapes || {},
      timestamp: performance.now(),
    };
  }

  /** Called every render frame from Character2DDisplayComponent. */
  getSnapshot(): PoseSnapshot {
    return this.latest;
  }
}
