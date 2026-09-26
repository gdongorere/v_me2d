import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm';

export interface LoadedModel {
  type: 'glb' | 'vrm';
  model: THREE.Group;
  vrm?: VRM;
}

@Injectable({
  providedIn: 'root'
})
export class GLBLoaderService {
  private _modelLoaded$ = new BehaviorSubject<LoadedModel | null>(null);
  private _isLoading$ = new BehaviorSubject<boolean>(false);
  private loader = new GLTFLoader();
  private currentModelUrl: string | null = null;
  
  constructor() {
    this.loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });
  }

  get modelLoaded$(): Observable<LoadedModel | null> {
    return this._modelLoaded$.asObservable();
  }

  get isLoading$(): Observable<boolean> {
    return this._isLoading$.asObservable();
  }

  async loadGLBFile(file: File | Blob): Promise<LoadedModel> {
    this._isLoading$.next(true);
    if (this.currentModelUrl) {
      URL.revokeObjectURL(this.currentModelUrl);
    }
    
    const buffer = await file.arrayBuffer();
    const blob = new Blob([buffer]);
    this.currentModelUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      this.loader.load(

        this.currentModelUrl!,
        (gltf) => {
          this._isLoading$.next(false);
          const vrm = gltf.userData['vrm'];
          const model: LoadedModel = {
            type: vrm ? 'vrm' : 'glb',
            model: gltf.scene,
            vrm: vrm
          };
          
          if (vrm) {
            VRMUtils.removeUnnecessaryVertices(gltf.scene);
            VRMUtils.removeUnnecessaryJoints(gltf.scene);
            vrm.scene.rotation.y = Math.PI; // Face the camera
          }

          this._modelLoaded$.next(model);
          resolve(model);
        },
        undefined,
        (error) => {
          this._isLoading$.next(false);
          reject(error);
        }
      );
    });
  }

  cleanup() {
    if (this.currentModelUrl) {
      URL.revokeObjectURL(this.currentModelUrl);
      this.currentModelUrl = null;
    }
  }
}
