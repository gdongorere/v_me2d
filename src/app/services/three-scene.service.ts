import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Injectable({
  providedIn: 'root'
})
export class ThreeSceneService {
  private scene = new THREE.Scene();
  private renderer!: THREE.WebGLRenderer;
  private camera!: THREE.PerspectiveCamera;
  private vrm: any;
  private currentVrm: any;
  private lookAtTarget = new THREE.Object3D();
  private mouse = new THREE.Vector2();
  private targetLookAtPos = new THREE.Vector3(0, 0, 0);
  private clock = new THREE.Clock();
  private controls!: OrbitControls;

  // Atmosphere settings
  private hemiLight!: THREE.HemisphereLight;
  private dirLight!: THREE.DirectionalLight;
  private rimLight1!: THREE.DirectionalLight;
  private rimLight2!: THREE.DirectionalLight;
  private spotLight!: THREE.SpotLight;
  
  constructor(private ngZone: NgZone) {
    this.camera = new THREE.PerspectiveCamera(30.0, window.innerWidth / window.innerHeight, 0.1, 20.0);
    this.camera.position.set(0.0, 1.4, 2.5);
  }

  init(canvas: HTMLCanvasElement) {
    const disableAntialiasing = localStorage.getItem('disableAntialiasing') === 'true';
    const pixelRatioSetting = localStorage.getItem('pixelRatio') || 'native';
    const disableShadows = localStorage.getItem('disableShadows') === 'true';

    let pixelRatio = Math.min(window.devicePixelRatio, 1.5);
    if (pixelRatioSetting === '1') pixelRatio = 1;
    else if (pixelRatioSetting === '0.5') pixelRatio = 0.5;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !disableAntialiasing, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    window.addEventListener('pointerdown', this.onPointerDown.bind(this));
    this.renderer.toneMappingExposure = 1.0;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0.5; // Prevent clipping into the face
    this.controls.maxDistance = 5.0; // Prevent zooming out to infinity
    this.controls.enablePan = true;
    this.controls.target.set(0, 1.4, 0);

    // Atmospheric Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    this.hemiLight.position.set(0, 1, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.dirLight.position.set(1.0, 1.0, 1.0).normalize();
    this.dirLight.castShadow = !disableShadows;
    this.scene.add(this.dirLight);

    this.rimLight1 = new THREE.DirectionalLight(0xff00ff, 0);
    this.rimLight1.position.set(-2, 1, -2);
    this.scene.add(this.rimLight1);

    this.rimLight2 = new THREE.DirectionalLight(0x00ffff, 0);
    this.rimLight2.position.set(2, 1, -2);
    this.scene.add(this.rimLight2);

    this.spotLight = new THREE.SpotLight(0xffa500, 0);
    this.spotLight.position.set(0, 3, 1);
    this.spotLight.angle = Math.PI / 6;
    this.spotLight.penumbra = 0.5;
    this.scene.add(this.spotLight);

    this.camera.add(this.lookAtTarget);

    const loader = new GLTFLoader();
    loader.register((parser: any) => new VRMLoaderPlugin(parser));
    
    // Create a generic placeholder or load a default URL if needed.
    // For now, let's keep it simple.

    // Pinch and zoom for selfie mode
    this.renderer.domElement.addEventListener('wheel', (e) => {
      if (this.selfieMode) {
        this.selfieDistance += e.deltaY * 0.005;
        this.selfieDistance = Math.max(0.2, Math.min(this.selfieDistance, 3.0));
      }
    });

    this.renderer.domElement.addEventListener('touchstart', (e) => {
      if (this.selfieMode && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        this.initialPointersDistance = Math.sqrt(dx * dx + dy * dy);
      }
    });

    this.renderer.domElement.addEventListener('touchmove', (e) => {
      if (this.selfieMode && e.touches.length === 2 && this.initialPointersDistance > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const delta = (this.initialPointersDistance - dist) * 0.01;
        this.selfieDistance += delta;
        this.selfieDistance = Math.max(0.2, Math.min(this.selfieDistance, 3.0));
        
        this.initialPointersDistance = dist;
      }
    });

    this.renderer.domElement.addEventListener('touchend', (e) => {
       if (e.touches.length < 2) {
           this.initialPointersDistance = -1;
       }
    });

    window.addEventListener('resize', this.onResize.bind(this));
    this.animate();
  }

  loadVRM(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.register((parser: any) => new VRMLoaderPlugin(parser));
      loader.load(
        url,
        (gltf: any) => {
          const vrm = gltf.userData.vrm;
          if (this.currentVrm) {
            try {
              if (this.currentVrm.scene) {
                this.scene.remove(this.currentVrm.scene);
                if (typeof this.currentVrm.dispose === 'function') {
                  this.currentVrm.dispose();
                }
              } else {
                this.scene.remove(this.currentVrm);
              }
            } catch (e) {
              console.error('Error disposing previous VRM', e);
            }
          }
          
          if (vrm) {
            this.currentVrm = vrm;
            this.scene.add(vrm.scene);
            vrm.scene.rotation.y = Math.PI;
            vrm.scene.updateMatrixWorld(true);
            
            if (vrm.lookAt) {
              vrm.lookAt.target = this.lookAtTarget; 
            }

            const headNode = vrm.humanoid?.getNormalizedBoneNode('head');
            if (headNode) {
               const v3 = new THREE.Vector3();
               headNode.getWorldPosition(v3);
               this.controls.target.copy(v3);
               
               // Ensure reasonable camera distance based on head position
               const camDist = 2.0; 
               this.camera.position.set(v3.x, v3.y, v3.z + camDist);
            }
          } else {
            // Fallback for standard .glb files without VRM extensions
            this.currentVrm = gltf.scene;
            this.scene.add(gltf.scene);
            gltf.scene.rotation.y = Math.PI;
            gltf.scene.updateMatrixWorld(true);
          }
          resolve();
        },
        (progress: any) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
        (error: any) => {
          console.error('Error loading VRM', error);
          reject(error);
        }
      );
    });
  }

  updateHeadRotation(pitch: number, yaw: number, roll: number, tx: number, ty: number, tz: number, isMirrored: boolean = true) {
    if (this.currentVrm && this.currentVrm.humanoid) {
      const humanoid = this.currentVrm.humanoid;
      
      const p = isNaN(pitch) ? 0 : pitch;
      const y = isNaN(yaw) ? 0 : yaw;
      const r = isNaN(roll) ? 0 : roll;

      const head = humanoid.getNormalizedBoneNode('head');
      const neck = humanoid.getNormalizedBoneNode('neck');
      const chest = humanoid.getNormalizedBoneNode('chest');
      const spine = humanoid.getNormalizedBoneNode('spine');

      const h = this.gestureHeadOffset;
      const bow = this.activeGesture === 'bow' ? this.gestureSpineOffset || 0 : 0;

      if (!isMirrored) {
          if (head) head.rotation.set(p * 0.5 + h.x, -y * 0.5 + h.y, -r * 0.5 + h.z);
          if (neck) neck.rotation.set(p * 0.3 + h.x * 0.5 + bow * 0.5, -y * 0.3 + h.y * 0.5, -r * 0.3 + h.z * 0.5);
          if (chest) chest.rotation.set(p * 0.2 + bow * 0.5, -y * 0.2, -r * 0.2);
          if (spine) spine.rotation.set(bow, 0, 0);
      } else {
          if (head) head.rotation.set(p * 0.5 + h.x, y * 0.5 + h.y, r * 0.5 + h.z);
          if (neck) neck.rotation.set(p * 0.3 + h.x * 0.5 + bow * 0.5, y * 0.3 + h.y * 0.5, r * 0.3 + h.z * 0.5);
          if (chest) chest.rotation.set(p * 0.2 + bow * 0.5, y * 0.2, r * 0.2);
          if (spine) spine.rotation.set(bow, 0, 0);
      }
    }
  }

  public whiteEyes = false;

  updateEyeRotation(leftPitch: number, leftYaw: number, rightPitch: number, rightYaw: number) {
    if (this.currentVrm && this.currentVrm.humanoid) {
       const humanoid = this.currentVrm.humanoid;
       let lp = isNaN(leftPitch) ? 0 : leftPitch;
       let ly = isNaN(leftYaw) ? 0 : leftYaw;
       let rp = isNaN(rightPitch) ? 0 : rightPitch;
       let ry = isNaN(rightYaw) ? 0 : rightYaw;

       const leftEye = humanoid.getNormalizedBoneNode('leftEye');
       const rightEye = humanoid.getNormalizedBoneNode('rightEye');

       let lz = 0, rz = 0;
       if (this.whiteEyes) {
         lz = Math.PI;
         rz = Math.PI;
       }

       if (leftEye) leftEye.rotation.set(lp, ly, lz);
       if (rightEye) rightEye.rotation.set(rp, ry, rz);
    }
  }

  applyBlendshape(name: string, value: number) {
     if (this.currentVrm && this.currentVrm.expressionManager) {
         const safeVal = isNaN(value) ? 0 : value;
         this.currentVrm.expressionManager.setValue(name, safeVal);
     }
  }

  private expressionTargets = new Map<string, number>();
  private currentExpressions = new Map<string, number>();
  private emojiSprite: THREE.Sprite | null = null;

  setFloatingEmoji(emoji: string | null) {
    if (!emoji) {
      if (this.emojiSprite) {
        this.emojiSprite.visible = false;
      }
      return;
    }

    if (!this.emojiSprite) {
      const material = new THREE.SpriteMaterial({ transparent: true, depthTest: false });
      this.emojiSprite = new THREE.Sprite(material);
      this.emojiSprite.scale.set(0.2, 0.2, 1);
      this.emojiSprite.renderOrder = 999;
      this.scene.add(this.emojiSprite);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 256, 256);
      ctx.font = '200px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 128, 140);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    this.emojiSprite.material.map = texture;
    this.emojiSprite.material.needsUpdate = true;
    this.emojiSprite.visible = true;
  }

  setExpressionTarget(name: string, value: number) {
     this.expressionTargets.set(name, value);
  }

  getAvailableExpressions(): string[] {
    if (this.currentVrm && this.currentVrm.expressionManager) {
      return this.currentVrm.expressionManager.expressions.map((e: any) => e.expressionName || e.name);
    }
    return [];
  }

  private targetCameraPosition = new THREE.Vector3(0, 1.4, 2.5);
  private targetCameraLookAt = new THREE.Vector3(0, 1.4, 0);
  private isCameraTransitioning = false;

  setCameraPreset(preset: string) {
    if (!this.currentVrm || !this.currentVrm.humanoid) return;
    const humanoid = this.currentVrm.humanoid;
    const head = humanoid.getNormalizedBoneNode('head');
    const chest = humanoid.getNormalizedBoneNode('chest');
    const hips = humanoid.getNormalizedBoneNode('hips');

    const v3 = new THREE.Vector3();
    if (preset === 'closeup' && head) {
      head.getWorldPosition(v3);
      this.targetCameraLookAt.copy(v3);
      this.targetCameraPosition.set(v3.x, v3.y, v3.z + 0.8);
      this.isCameraTransitioning = true;
    } else if (preset === 'halfbody' && chest) {
      chest.getWorldPosition(v3);
      this.targetCameraLookAt.copy(v3);
      this.targetCameraPosition.set(v3.x, v3.y + 0.2, v3.z + 1.5);
      this.isCameraTransitioning = true;
    } else if (preset === 'fullbody' && hips) {
      hips.getWorldPosition(v3);
      this.targetCameraLookAt.copy(v3);
      this.targetCameraPosition.set(v3.x, v3.y + 0.5, v3.z + 3.0);
      this.isCameraTransitioning = true;
    }
  }

  setLightingPreset(preset: string) {
    if (preset === 'studioSoft') {
      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0x444444);
      this.hemiLight.intensity = 1.0;
      this.dirLight.color.setHex(0xffffff);
      this.dirLight.intensity = 1.0;
      this.rimLight1.intensity = 0;
      this.rimLight2.intensity = 0;
      this.spotLight.intensity = 0;
    } else if (preset === 'neonCyberpunk') {
      this.hemiLight.color.setHex(0x111122);
      this.hemiLight.groundColor.setHex(0x000000);
      this.hemiLight.intensity = 0.2;
      this.dirLight.intensity = 0.1;
      this.rimLight1.color.setHex(0xff00ff);
      this.rimLight1.intensity = 3.0;
      this.rimLight2.color.setHex(0x00ffff);
      this.rimLight2.intensity = 3.0;
      this.spotLight.intensity = 0;
    } else if (preset === 'dramaticWarm') {
      this.hemiLight.color.setHex(0x221100);
      this.hemiLight.groundColor.setHex(0x000000);
      this.hemiLight.intensity = 0.1;
      this.dirLight.intensity = 0;
      this.rimLight1.intensity = 0;
      this.rimLight2.intensity = 0;
      this.spotLight.color.setHex(0xffaa00);
      this.spotLight.intensity = 5.0;
      if (this.currentVrm && this.currentVrm.humanoid) {
          const head = this.currentVrm.humanoid.getNormalizedBoneNode('head');
          if (head) this.spotLight.target = head;
      }
    }
  }

  private glassesProp: THREE.Group | null = null;

  toggleProp(propName: string, enable: boolean) {
    if (!this.currentVrm || !this.currentVrm.humanoid) return;
    const headNode = this.currentVrm.humanoid.getNormalizedBoneNode('head');
    if (!headNode) return;

    if (propName === 'sunglasses') {
      if (enable) {
        if (!this.glassesProp) {
          this.glassesProp = new THREE.Group();
          
          // Left lens
          const lensGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.005, 32);
          lensGeo.rotateX(Math.PI / 2);
          const lensMat = new THREE.MeshPhysicalMaterial({
            color: 0x111111,
            metalness: 0.9,
            roughness: 0.1,
            transmission: 0.5,
            transparent: true
          });
          const leftLens = new THREE.Mesh(lensGeo, lensMat);
          leftLens.position.set(-0.04, 0.03, 0.12);
          this.glassesProp.add(leftLens);

          // Right lens
          const rightLens = new THREE.Mesh(lensGeo, lensMat);
          rightLens.position.set(0.04, 0.03, 0.12);
          this.glassesProp.add(rightLens);

          // Bridge
          const bridgeGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.02, 8);
          bridgeGeo.rotateZ(Math.PI / 2);
          const frameMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 });
          const bridge = new THREE.Mesh(bridgeGeo, frameMat);
          bridge.position.set(0, 0.03, 0.12);
          this.glassesProp.add(bridge);

          // Arms
          const armGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.1, 8);
          armGeo.rotateX(Math.PI / 2);
          const leftArm = new THREE.Mesh(armGeo, frameMat);
          leftArm.position.set(-0.08, 0.03, 0.07);
          this.glassesProp.add(leftArm);

          const rightArm = new THREE.Mesh(armGeo, frameMat);
          rightArm.position.set(0.08, 0.03, 0.07);
          this.glassesProp.add(rightArm);
        }
        headNode.add(this.glassesProp);
      } else {
        if (this.glassesProp) {
          headNode.remove(this.glassesProp);
        }
      }
    }
  }

  setBackground(type: string) {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    
    if (type === 'greenScreen') {
      this.scene.background = new THREE.Color(0x00ff00);
      this.renderer.setClearColor(0x00ff00, 1);
    } else if (type === 'streamingRoom') {
      loader.load('https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1920&q=80', (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = texture;
      });
      this.renderer.setClearColor(0x000000, 1);
    } else if (type === 'neonCity') {
      loader.load('https://images.unsplash.com/photo-1555580399-524672e81112?auto=format&fit=crop&w=1920&q=80', (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = texture;
      });
      this.renderer.setClearColor(0x000000, 1);
    } else if (type === 'nature') {
      loader.load('https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1920&q=80', (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        this.scene.background = texture;
      });
      this.renderer.setClearColor(0x000000, 1);
    } else {
      this.scene.background = null;
      this.renderer.setClearColor(0x000000, 0);
    }
  }

  setAtmosphere(hemiIntensity: number, dirIntensity: number, exposure: number) {
    if (this.hemiLight) this.hemiLight.intensity = hemiIntensity;
    if (this.dirLight) this.dirLight.intensity = dirIntensity;
    if (this.renderer) this.renderer.toneMappingExposure = exposure;
  }

  onResize() {
    const container = this.renderer.domElement.parentElement;
    if (container) {
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    } else {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  }

  private devicePitch = 0;
  private deviceYaw = 0;
  private deviceRoll = 0;
  private selfieMode = false;
  private selfieDistance = 0.8;
  private initialPointersDistance = -1;

  updateCameraOrientation(pitch: number, yaw: number, roll: number, selfieMode: boolean) {
    this.devicePitch = pitch;
    this.deviceYaw = yaw;
    this.deviceRoll = roll;

    if (this.selfieMode && !selfieMode && this.currentVrm && this.currentVrm.humanoid) {
       const headNode = this.currentVrm.humanoid.getNormalizedBoneNode('head');
       if (headNode) {
          const v3 = new THREE.Vector3();
          headNode.getWorldPosition(v3);
          this.controls.target.copy(v3);
          this.camera.position.set(v3.x, v3.y, v3.z + 2.0); // Reset distance
       }
    }

    this.selfieMode = selfieMode;
    
    if (this.controls) {
       this.controls.enabled = !selfieMode;
       if (!selfieMode) {
          this.camera.rotation.z = 0; // reset roll
       }
    }
  }

  setEyeLookAt(x: number, y: number) {
    const fov = 30; 
    const cameraZ = 2.5; 
    const viewHalfHeight = cameraZ * Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const viewHalfWidth = viewHalfHeight * this.camera.aspect;
    
    this.targetLookAtPos.set(x * viewHalfWidth * 1.5, y * viewHalfHeight * 1.5, 0);
  }

  private onPointerDown(event: PointerEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Scale slightly to make the look angle noticeable but natural
    const fov = 30; 
    const cameraZ = 2.5; 
    const viewHalfHeight = cameraZ * Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const viewHalfWidth = viewHalfHeight * this.camera.aspect;
    
    this.targetLookAtPos.set(this.mouse.x * viewHalfWidth * 1.5, this.mouse.y * viewHalfHeight * 1.5, 0);
  }

  private lastRenderTime = 0;
  private readonly RENDER_INTERVAL = 1000 / 30; // 30 FPS

  animate() {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(this.animate.bind(this));
      
      const now = performance.now();
      if (now - this.lastRenderTime < this.RENDER_INTERVAL) {
        return;
      }
      this.lastRenderTime = now;
      
      const deltaTime = this.clock.getDelta();
      const elapsedTime = this.clock.getElapsedTime();

    if (this.isCameraTransitioning && !this.selfieMode) {
      const lerpFactor = 1 - Math.exp(-5.0 * deltaTime);
      this.camera.position.lerp(this.targetCameraPosition, lerpFactor);
      this.controls.target.lerp(this.targetCameraLookAt, lerpFactor);
      this.controls.update();
      if (this.camera.position.distanceTo(this.targetCameraPosition) < 0.01) {
          this.isCameraTransitioning = false;
      }
    } else if (this.controls && !this.selfieMode) {
        this.controls.update();
    }

    // Smoothly update lookAtTarget
    const lookAtLerp = 1 - Math.exp(-5.0 * deltaTime);
    this.lookAtTarget.position.lerp(this.targetLookAtPos, lookAtLerp);

    this.applyIdleAnimation(elapsedTime);

    if (this.currentVrm && typeof this.currentVrm.update === 'function') {
      this.currentVrm.update(deltaTime);
    }
    
    if (this.currentVrm && this.currentVrm.expressionManager) {
      const exprLerp = 1 - Math.exp(-10.0 * deltaTime);
      for (const [name, target] of this.expressionTargets.entries()) {
          const current = this.currentExpressions.get(name) || 0;
          const newValue = current + (target - current) * exprLerp;
          this.currentExpressions.set(name, newValue);
          this.currentVrm.expressionManager.setValue(name, newValue);
      }
      this.currentVrm.expressionManager.update();
    }

    if (this.emojiSprite && this.emojiSprite.visible && this.currentVrm && this.currentVrm.humanoid) {
      const headNode = this.currentVrm.humanoid.getNormalizedBoneNode('head');
      if (headNode) {
        const headPos = new THREE.Vector3();
        headNode.getWorldPosition(headPos);
        const time = Date.now() * 0.003;
        const bobOffset = Math.sin(time) * 0.03;
        this.emojiSprite.position.set(headPos.x + 0.25, headPos.y + 0.15 + bobOffset, headPos.z);
      }
    }

    // Apply Selfie Mode Camera Tracking
    if (this.selfieMode && this.currentVrm && this.currentVrm.humanoid) {
       const headNode = this.currentVrm.humanoid.getNormalizedBoneNode('head');
       if (headNode) {
         const headPos = new THREE.Vector3();
         headNode.getWorldPosition(headPos);
         
         const R = this.selfieDistance; // Selfie arm length
         this.camera.position.x = headPos.x + R * Math.sin(this.deviceRoll) * Math.cos(this.devicePitch);
         this.camera.position.y = headPos.y - R * Math.sin(this.devicePitch);
         this.camera.position.z = headPos.z + R * Math.cos(this.deviceRoll) * Math.cos(this.devicePitch);
         this.camera.lookAt(headPos);
       }
    }
    
    this.renderer.render(this.scene, this.camera);
    });
  }

  private hasPoseData = false;
  
  public activeGesture: string | null = null;
  public gestureStartTime: number = 0;
  public gestureHeadOffset = { x: 0, y: 0, z: 0 };
  public gestureSpineOffset: number = 0;

  playGesture(gesture: string) {
    this.activeGesture = gesture;
    this.gestureStartTime = Date.now();
  }

  private activeBones = new Map<string, number>();

  private isBoneActive(boneName: string): boolean {
     return (performance.now() - (this.activeBones.get(boneName) || 0)) < 500;
  }

  private lastMajorIdleTime = 0;
  private isMajorIdleActive = false;
  private majorIdleDuration = 0;
  private majorIdleOffsets = { leftArmX: 0, rightArmX: 0, leftArmZ: 0, rightArmZ: 0, spineX: 0, spineY: 0, headX: 0, headY: 0 };
  private currentMajorWeight = 0;

  private lerpBoneRotation(bone: any, targetX: number, targetY: number, targetZ: number, factor: number) {
     if (!bone) return;
     bone.rotation.x += (targetX - bone.rotation.x) * factor;
     bone.rotation.y += (targetY - bone.rotation.y) * factor;
     // Handle Euler wrap around for Z is not usually needed for arms in idle, but let's use simple lerp
     bone.rotation.z += (targetZ - bone.rotation.z) * factor;
  }

  updatePoseRotation(poseData: Record<string, any>, isMirrored: boolean) {
     this.hasPoseData = true;
     if (!this.currentVrm || !this.currentVrm.humanoid) return;
     const humanoid = this.currentVrm.humanoid;

     for (const [boneName, rot] of Object.entries(poseData)) {
        let vrmBoneName = boneName.charAt(0).toLowerCase() + boneName.slice(1);
        
        // Out of the box, mapping Right to Right acts like a mirror because the user's Right 
        // appears on the Left of their camera, and the Avatar's Right is on the Left of the screen.
        // So if isMirrored is FALSE, we must SWAP the bones to break the mirror illusion.
        if (!isMirrored) {
            if (vrmBoneName.startsWith('left')) {
                vrmBoneName = 'right' + vrmBoneName.slice(4);
            } else if (vrmBoneName.startsWith('right')) {
                vrmBoneName = 'left' + vrmBoneName.slice(5);
            }
        }
        
        this.activeBones.set(vrmBoneName, performance.now());

        if (this.activeGesture === 'wave' && (vrmBoneName === 'rightUpperArm' || vrmBoneName === 'rightLowerArm' || vrmBoneName === 'rightHand' || vrmBoneName === 'leftUpperArm' || vrmBoneName === 'leftLowerArm' || vrmBoneName === 'leftHand')) {
           continue;
        }
        if (this.activeGesture === 'bow' && (vrmBoneName === 'spine' || vrmBoneName === 'chest' || vrmBoneName === 'upperChest' || vrmBoneName === 'neck')) {
           continue;
        }
        
        const rx = isNaN(rot.x) ? 0 : rot.x;
        const ry = isNaN(rot.y) ? 0 : rot.y;
        const rz = isNaN(rot.z) ? 0 : rot.z;

        const bone = humanoid.getNormalizedBoneNode(vrmBoneName);
        if (bone) {
           if (!isMirrored && (vrmBoneName.includes('Arm') || vrmBoneName.includes('Hand') || vrmBoneName.includes('Leg'))) {
              bone.rotation.set(rx, -ry, -rz);
           } else if (!isMirrored) {
              bone.rotation.set(rx, -ry, -rz);
           } else {
              bone.rotation.set(rx, ry, rz);
           }
        }
     }
  }

  private applyIdleAnimation(time: number) {
    if (this.currentVrm && this.currentVrm.humanoid) {
      const humanoid = this.currentVrm.humanoid;
      
      const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
      const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
      const leftLowerArm = humanoid.getNormalizedBoneNode('leftLowerArm');
      const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
      const leftHand = humanoid.getNormalizedBoneNode('leftHand');
      const rightHand = humanoid.getNormalizedBoneNode('rightHand');
      const spine = humanoid.getNormalizedBoneNode('spine');
      const hips = humanoid.getNormalizedBoneNode('hips');
      const neck = humanoid.getNormalizedBoneNode('neck');
      const head = humanoid.getNormalizedBoneNode('head');

      const slowTime = time * 0.05;
      const breath = Math.sin(slowTime * 2.0) * 0.0005;
      const sway = Math.sin(slowTime * 0.8) * 0.0002;
      const microSway = Math.cos(slowTime * 1.5) * 0.0002;

      const idleSpeed = 0.05;
      
      let rArmRot = {x: 0.1 + microSway, y: 0, z: -1.1 - sway};
      let rLowerArmRot = {x: -0.1, y: 0, z: -0.1 - breath};
      let rHandRot = {x: -0.1, y: 0, z: 0};
      
      this.gestureHeadOffset.x = 0;
      this.gestureHeadOffset.y = 0;
      this.gestureHeadOffset.z = 0;
      this.gestureSpineOffset = 0;

      if (this.activeGesture) {
         const t = (Date.now() - this.gestureStartTime) / 1000;
         
         if (this.activeGesture === 'wave') {
            if (t > 2.5) {
               this.activeGesture = null;
            } else {
               rArmRot = {x: 0, y: 0, z: 1.2}; // Raise arm up, slightly out
               rLowerArmRot = {x: 0, y: 0, z: -1.0 + Math.sin(t * 15) * 0.6}; // Bend elbow inwards and wave
            }
         } else if (this.activeGesture === 'nod') {
            if (t > 1.5) {
               this.activeGesture = null;
            } else {
               this.gestureHeadOffset.x = Math.sin(t * 10) * 0.2;
            }
         } else if (this.activeGesture === 'shake') {
            if (t > 1.5) {
               this.activeGesture = null;
            } else {
               this.gestureHeadOffset.y = Math.sin(t * 10) * 0.25;
            }
         } else if (this.activeGesture === 'bow') {
            if (t > 2.0) {
               this.activeGesture = null;
            } else {
               this.gestureSpineOffset = Math.sin(t * Math.PI / 2.0) * 0.4;
            }
         }
      }

      const armSpeed = this.activeGesture === 'wave' ? 0.3 : idleSpeed;

      if (!this.isBoneActive('leftUpperArm') && leftUpperArm) {
          this.lerpBoneRotation(leftUpperArm, 0.1 + microSway, 0, 1.1 + sway, idleSpeed);
      }
      if ((this.activeGesture === 'wave' || !this.isBoneActive('rightUpperArm')) && rightUpperArm) {
          this.lerpBoneRotation(rightUpperArm, rArmRot.x, rArmRot.y, rArmRot.z, armSpeed);
      }
      if (!this.isBoneActive('leftLowerArm') && leftLowerArm) {
          this.lerpBoneRotation(leftLowerArm, -0.1, 0, 0.1 + breath, idleSpeed);
      }
      if ((this.activeGesture === 'wave' || !this.isBoneActive('rightLowerArm')) && rightLowerArm) {
          this.lerpBoneRotation(rightLowerArm, rLowerArmRot.x, rLowerArmRot.y, rLowerArmRot.z, armSpeed);
      }
      if (!this.isBoneActive('leftHand') && leftHand) {
          this.lerpBoneRotation(leftHand, -0.1, 0, 0, idleSpeed);
      }
      if ((this.activeGesture === 'wave' || !this.isBoneActive('rightHand')) && rightHand) {
          this.lerpBoneRotation(rightHand, rHandRot.x, rHandRot.y, rHandRot.z, armSpeed);
      }

      if (this.activeGesture !== 'bow') {
          if (!this.isBoneActive('spine') && spine) {
              this.lerpBoneRotation(spine, breath, sway, 0, idleSpeed);
          }
          if (!this.isBoneActive('neck') && neck) {
              this.lerpBoneRotation(neck, 0, 0, 0, idleSpeed);
          }
      }
      if (!this.isBoneActive('hips') && hips) {
          this.lerpBoneRotation(hips, 0, 0, sway * 0.5, idleSpeed);
      }
    }
  }
}
