import { Injectable, NgZone } from '@angular/core';
import { FilesetResolver, FaceLandmarker, PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';

@Injectable({
  providedIn: 'root'
})
export class FaceTrackingService {
  private faceLandmarker: FaceLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private video!: HTMLVideoElement;
  private trackingActive = false;
  private lastVideoTime = -1;
  private onResultCallback?: (faceResult: any, poseResult: any, handResult: any) => void;
  // FPS Limit requested by user: ~4 FPS for face tracking to save performance, but 30FPS for renderer
  private lastTrackingTime = 0;
  private readonly TRACKING_INTERVAL_MS = 1000 / 4; // 4 FPS
  
  private lastPoseTime = 0;
  private lastPoseResults: any = null;
  private lastHandResults: any = null;

  constructor(private ngZone: NgZone) {}

  async initFaceTracking(videoEl: HTMLVideoElement, onResult: (faceResult: any, poseResult: any, handResult: any) => void, onError?: (err: any) => void) {
    this.video = videoEl;
    this.onResultCallback = onResult;

    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });

      this.poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      });

      // Hand tracking is too slow on most web devices, disabling for performance
      // this.handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
      //   baseOptions: {
      //     modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      //     delegate: 'GPU'
      //   },
      //   runningMode: 'VIDEO',
      //   numHands: 1
      // });

      await this.startCamera(onError);
    } catch (err) {
      console.error('Tracking initialization error', err);
      if (onError) onError(err);
    }
  }

  private stream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  public audioEnabled = false; 
  public videoEnabled = true;

  private audioContext: AudioContext | null = null;
  private audioSource: MediaStreamAudioSourceNode | null = null;
  private audioDest: MediaStreamAudioDestinationNode | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private ringModGain: GainNode | null = null;

  getStream() {
     return this.processedStream || this.stream;
  }

  setVoiceModulation(freq: number) {
    if (!this.oscillator || !this.dryGain || !this.ringModGain) return;
    if (freq === 0) {
      this.dryGain.gain.value = 1;
      this.ringModGain.gain.value = 0;
    } else {
      this.dryGain.gain.value = 0;
      this.ringModGain.gain.value = 1;
      this.oscillator.frequency.value = freq;
    }
  }

  private setupAudioEffect() {
      if (!this.stream || this.stream.getAudioTracks().length === 0) return;
      
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.audioSource = this.audioContext.createMediaStreamSource(this.stream);
      this.audioDest = this.audioContext.createMediaStreamDestination();
      
      this.gainNode = this.audioContext.createGain();
      this.oscillator = this.audioContext.createOscillator();
      this.oscillator.type = 'sine';
      this.oscillator.frequency.value = 50;
      this.oscillator.start();
      
      this.ringModGain = this.audioContext.createGain();
      this.ringModGain.gain.value = 0; // wet
      
      this.dryGain = this.audioContext.createGain();
      this.dryGain.gain.value = 1; // dry

      this.audioSource.connect(this.dryGain);
      this.dryGain.connect(this.audioDest);
      
      this.audioSource.connect(this.gainNode);
      this.oscillator.connect(this.gainNode.gain);
      this.gainNode.connect(this.ringModGain);
      this.ringModGain.connect(this.audioDest);
      
      this.processedStream = new MediaStream();
      this.audioDest.stream.getAudioTracks().forEach(t => this.processedStream?.addTrack(t));
      this.stream.getVideoTracks().forEach(t => this.processedStream?.addTrack(t));
  }

  setAudioEnabled(enabled: boolean) {
    this.audioEnabled = enabled;
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => track.enabled = enabled);
    }
  }

  setVideoEnabled(enabled: boolean) {
    this.videoEnabled = enabled;
    if (this.stream) {
      this.stream.getVideoTracks().forEach(track => track.enabled = enabled);
    }
  }

  private async startCamera(onError?: (err: any) => void) {
    const resSetting = localStorage.getItem('cameraResolution') || 'medium';
    let width = 320;
    let height = 240;
    if (resSetting === 'high') { width = 640; height = 480; }
    else if (resSetting === 'low') { width = 160; height = 120; }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: width, height: height, frameRate: { ideal: 15, max: 30 } },
        audio: true
      });
      // Set initial states
      this.stream.getAudioTracks().forEach(track => track.enabled = this.audioEnabled);
      this.stream.getVideoTracks().forEach(track => track.enabled = this.videoEnabled);
      
      this.setupAudioEffect();

      this.video.srcObject = this.stream;
      this.video.volume = 0; // Prevent echo locally
      this.video.play();
      this.video.addEventListener('loadeddata', () => {
        if (!this.trackingActive) {
          this.trackingActive = true;
          this.ngZone.runOutsideAngular(() => this.predictLoop());
        }
      });
    } catch (err) {
      console.error('Camera error', err);
      // Try again without audio if it fails?
      try {
         this.stream = await navigator.mediaDevices.getUserMedia({
           video: { width: width, height: height, frameRate: { ideal: 15, max: 30 } }
         });
         this.stream.getVideoTracks().forEach(track => track.enabled = this.videoEnabled);
         this.video.srcObject = this.stream;
         this.video.play();
         this.video.addEventListener('loadeddata', () => {
           if (!this.trackingActive) {
             this.trackingActive = true;
             this.ngZone.runOutsideAngular(() => this.predictLoop());
           }
         });
      } catch (err2) {
         if (onError) onError(err2);
      }
    }
  }

  private predictLoop() {
    if (!this.trackingActive) return;

    requestAnimationFrame(() => this.predictLoop());

    const now = performance.now();
    
    if (now - this.lastTrackingTime < this.TRACKING_INTERVAL_MS) {
        return;
    }

    if (this.video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = this.video.currentTime;
      let faceResults = null;
      let poseResults = null;
      let handResults = null;
      
      if (this.faceLandmarker) {
          faceResults = this.faceLandmarker.detectForVideo(this.video, now);
      }
      
      // Throttle pose tracking to 4 fps
      if (now - this.lastPoseTime > 1000 / 4) {
          this.lastPoseTime = now;
          if (this.poseLandmarker) {
              poseResults = this.poseLandmarker.detectForVideo(this.video, now);
              this.lastPoseResults = poseResults;
          }
          // Hand tracking disabled
          // if (this.handLandmarker) {
          //     handResults = this.handLandmarker.detectForVideo(this.video, now);
          //     this.lastHandResults = handResults;
          // }
      } else {
          poseResults = this.lastPoseResults;
          // handResults = this.lastHandResults;
      }
      
      this.lastTrackingTime = now;
      if (this.onResultCallback) {
        this.onResultCallback(faceResults, poseResults, handResults);
      }
    }
  }

  stopTracking() {
    this.trackingActive = false;
    if (this.video?.srcObject) {
      const stream = this.video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  }
}
