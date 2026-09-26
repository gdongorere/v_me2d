import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private _cameraActive$ = new BehaviorSubject<boolean>(false);
  private _cameraReady$ = new BehaviorSubject<boolean>(false);
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private mirrorCamera = false;
  private showCameraFeed = false;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioDataArray: Uint8Array | null = null;
  private _audioVolume$ = new BehaviorSubject<number>(0);

  get audioVolume$(): Observable<number> {
    return this._audioVolume$.asObservable();
  }

  get cameraActive$(): Observable<boolean> {
    return this._cameraActive$.asObservable();
  }

  get cameraReady$(): Observable<boolean> {
    return this._cameraReady$.asObservable();
  }

  constructor() {
    this.checkCameraAvailability();
  }

  private checkCameraAvailability() {
    const available = !!navigator.mediaDevices?.getUserMedia;
    this._cameraReady$.next(available);
  }

  private enableAudio = false;

  setEnableAudio(enable: boolean) {
    this.enableAudio = enable;
  }

  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: this.enableAudio
      });

      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.setAttribute('playsinline', '');
        document.body.appendChild(this.videoElement);
      }
      
      this.updateVideoStyles();

      this.videoElement.srcObject = this.stream;
      this.videoElement.play();

      await new Promise(resolve => {
        if (this.videoElement) {
          this.videoElement.onloadedmetadata = resolve;
        }
      });

      this.initAudioAnalysis();
      this._cameraActive$.next(true);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        throw new Error('Camera access denied');
      } else if (error instanceof Error && error.name === 'NotFoundError') {
        throw new Error('No camera found');
      } else {
        throw error;
      }
    }
  }

  private initAudioAnalysis() {
    if (!this.stream || this.stream.getAudioTracks().length === 0) return;
    
    // Only init if window is defined
    if (typeof window === 'undefined') return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.audioContext = new AudioContextClass();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);
    this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateVolume = () => {
      if (!this.stream) return;
      if (this.analyser && this.audioDataArray) {
        this.analyser.getByteFrequencyData(this.audioDataArray as any);
        let sum = 0;
        for (let i = 0; i < this.audioDataArray.length; i++) {
          sum += this.audioDataArray[i];
        }
        const average = sum / this.audioDataArray.length;
        // Normalize 0-255 to 0-1
        this._audioVolume$.next(Math.min(1, average / 100));
      }
      requestAnimationFrame(updateVolume);
    };
    updateVolume();
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.pause();
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this._cameraActive$.next(false);
    this._audioVolume$.next(0);
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  setMirror(mirror: boolean) {
    this.mirrorCamera = mirror;
    this.updateVideoStyles();
  }

  toggleCameraVisibility(show: boolean) {
    this.showCameraFeed = show;
    this.updateVideoStyles();
  }

  private updateVideoStyles() {
    if (this.videoElement) {
      if (this.showCameraFeed) {
        this.videoElement.style.display = 'block';
        this.videoElement.style.position = 'fixed';
        this.videoElement.style.bottom = '20px';
        this.videoElement.style.right = '20px';
        this.videoElement.style.width = '160px';
        this.videoElement.style.height = '120px';
        this.videoElement.style.objectFit = 'cover';
        this.videoElement.style.borderRadius = '8px';
        this.videoElement.style.zIndex = '1000';
        this.videoElement.style.border = '2px solid rgba(255, 255, 255, 0.2)';
        this.videoElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.5)';
      } else {
        this.videoElement.style.display = 'none';
      }
      this.videoElement.style.transform = this.mirrorCamera ? 'scaleX(-1)' : 'none';
    }
  }
}
