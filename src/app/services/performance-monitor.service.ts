import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PerformanceMonitorService {
  private _fps$ = new BehaviorSubject<number>(0);
  private _memoryUsage$ = new BehaviorSubject<number>(0);
  private frameCount = 0;
  private lastTime = performance.now();

  get fps$(): Observable<number> {
    return this._fps$.asObservable();
  }

  get memoryUsage$(): Observable<number> {
    return this._memoryUsage$.asObservable();
  }

  recordFrame() {
    this.frameCount++;
    const now = performance.now();
    const deltaTime = now - this.lastTime;

    if (deltaTime >= 1000) {
      const currentFps = this.frameCount;
      this._fps$.next(currentFps);
      this.frameCount = 0;
      this.lastTime = now;

      const perf = performance as unknown as { memory?: { usedJSHeapSize: number } };
      if (perf.memory) {
        const memoryMB = perf.memory.usedJSHeapSize / 1048576;
        this._memoryUsage$.next(Math.round(memoryMB));
      }

      // We won't log the warning anymore to keep the console clean
    }
  }
}
