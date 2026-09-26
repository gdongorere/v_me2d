/**
 * V-Me 2D Character Display Component
 * Thin wrapper around Character2DRendererService + Character2DAnimatorService.
 *
 * Two modes:
 *  - Live mode (default, [livePose]="true"): reads the latest solved pose
 *    from PoseBridgeService every frame. AppComponent pushes into that
 *    bridge once per tracking callback (see MASTER-IMPLEMENTATION-PLAN.md
 *    Milestone 3, Step 3.2) — this component never talks to MediaPipe or
 *    Kalidokit directly.
 *  - Static/preview mode ([livePose]="false"): uses a fixed standing pose
 *    from Character2DAnimatorService.getStandingPose() instead, so the
 *    Character Creator can show a live preview without turning on the
 *    webcam.
 */

import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Character2D } from '../models/character-2d.models';
import { Character2DRendererService } from '../services/character-2d-renderer.service';
import { Character2DAnimatorService } from '../services/character-2d-animator.service';
import { PoseBridgeService } from '../services/pose-bridge.service';

@Component({
  selector: 'app-character-2d-display',
  standalone: true,
  imports: [CommonModule],
  template: `<canvas #displayCanvas class="w-full h-full block"></canvas>`,
})
export class Character2DDisplayComponent implements OnInit, OnDestroy {
  @Input() character!: Character2D;
  /** Set to false for the creator preview (no camera needed). */
  @Input() livePose = true;

  @ViewChild('displayCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private destroyed = false;

  constructor(
    private renderer: Character2DRendererService,
    private animator: Character2DAnimatorService,
    private poseBridge: PoseBridgeService
  ) {}

  ngOnInit(): void {
    this.renderer.init(this.canvasRef.nativeElement);
    this.destroyed = false;
    this.lastTimestamp = 0;
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  private loop = (timestamp: number): void => {
    if (this.destroyed) return;

    const deltaTime = this.lastTimestamp ? timestamp - this.lastTimestamp : 16;
    this.lastTimestamp = timestamp;

    if (this.character) {
      const snapshot = this.livePose ? this.poseBridge.getSnapshot() : this.animator.getStandingPose();

      const frame = this.animator.animate(this.character, snapshot, null, deltaTime);
      this.renderer.render(this.character, frame.bodyTransforms, frame.expressions);
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer.dispose();
  }
}
