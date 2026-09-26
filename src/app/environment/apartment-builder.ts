/**
 * V-Me Apartment Builder
 * Procedurally constructs the default 1-bedroom apartment from data tables.
 * Ref: Environment Addendum §19.10
 */

import * as THREE from 'three';
import {
  ApartmentDef,
  RoomDef,
  WallSegment,
  FurnitureDef,
  DoorDef,
  MarkerPoint,
  LightDef,
} from './environment.models';

const FLOOR_OAK = '#B98A5E';
const FLOOR_CARPET = '#8C7B6B';
const FLOOR_TILE = '#DCE3E6';
const WALL_PAINT = '#EDE7DD';
const WOOD_FURNITURE = '#6B4A32';
const FABRIC_SOFA = '#4A5568';
const METAL_ACCENT = '#8A8F98';
const GLASS_WINDOW = '#BFE3F0';

export class ApartmentBuilder {
  static createDefaultApartment(): ApartmentDef {
    return {
      id: 'apartment-default',
      name: 'Default 1-Bedroom Apartment',
      rooms: this.createRooms(),
      walls: this.createWalls(),
      doors: this.createDoors(),
      furniture: this.createFurniture(),
      markers: this.createMarkers(),
      lights: this.createLights(),
    };
  }

  private static createRooms(): RoomDef[] {
    return [
      {
        id: 'living',
        name: 'Living Room / Kitchen',
        bounds: {
          id: 'bounds-living',
          center: { x: 2.4, y: 0, z: 2.8 },
          halfExtents: { x: 2.4, y: 2.5, z: 2.8 },
          rotationY: 0,
        },
        floorMaterialId: 'floor-oak',
        ceilingHeight: 2.5,
      },
      {
        id: 'bedroom',
        name: 'Bedroom',
        bounds: {
          id: 'bounds-bedroom',
          center: { x: 6.0, y: 0, z: 4.0 },
          halfExtents: { x: 1.2, y: 2.5, z: 1.6 },
          rotationY: 0,
        },
        floorMaterialId: 'floor-carpet',
        ceilingHeight: 2.5,
      },
      {
        id: 'bathroom',
        name: 'Bathroom',
        bounds: {
          id: 'bounds-bathroom',
          center: { x: 6.0, y: 0, z: 1.2 },
          halfExtents: { x: 1.2, y: 2.5, z: 1.2 },
          rotationY: 0,
        },
        floorMaterialId: 'floor-tile',
        ceilingHeight: 2.5,
      },
    ];
  }

  private static createWalls(): WallSegment[] {
    return [
      {
        id: 'wall-south',
        roomIds: ['living', undefined],
        from: { x: 0, z: 0 },
        to: { x: 4.8, z: 0 },
        thickness: 0.12,
        height: 2.5,
        openings: [{ kind: 'door', from: 0.6, to: 1.6, doorId: 'door-entry' }],
      },
      {
        id: 'wall-south-bath',
        roomIds: ['bathroom', undefined],
        from: { x: 4.8, z: 0 },
        to: { x: 7.2, z: 0 },
        thickness: 0.12,
        height: 2.5,
        openings: [{ kind: 'window', from: 1.6, to: 2.4, sillHeight: 1.2 }],
      },
      {
        id: 'wall-west',
        roomIds: ['living', undefined],
        from: { x: 0, z: 0 },
        to: { x: 0, z: 5.6 },
        thickness: 0.12,
        height: 2.5,
        openings: [],
      },
      {
        id: 'wall-north-living',
        roomIds: ['living', undefined],
        from: { x: 0, z: 5.6 },
        to: { x: 4.8, z: 5.6 },
        thickness: 0.12,
        height: 2.5,
        openings: [{ kind: 'window', from: 1.8, to: 3.8, sillHeight: 0.9 }],
      },
      {
        id: 'wall-north-bed',
        roomIds: ['bedroom', undefined],
        from: { x: 4.8, z: 5.6 },
        to: { x: 7.2, z: 5.6 },
        thickness: 0.12,
        height: 2.5,
        openings: [{ kind: 'window', from: 0.6, to: 1.8, sillHeight: 0.9 }],
      },
      {
        id: 'wall-east',
        roomIds: ['bedroom', undefined],
        from: { x: 7.2, z: 0 },
        to: { x: 7.2, z: 5.6 },
        thickness: 0.12,
        height: 2.5,
        openings: [],
      },
      {
        id: 'wall-divider-long',
        roomIds: ['living', 'bedroom'],
        from: { x: 4.8, z: 0 },
        to: { x: 4.8, z: 5.6 },
        thickness: 0.12,
        height: 2.5,
        openings: [
          { kind: 'door', from: 0.6, to: 1.6, doorId: 'door-bathroom' },
          { kind: 'doorway', from: 3.2, to: 4.2 },
        ],
      },
      {
        id: 'wall-bed-bath',
        roomIds: ['bedroom', 'bathroom'],
        from: { x: 4.8, z: 2.4 },
        to: { x: 7.2, z: 2.4 },
        thickness: 0.12,
        height: 2.5,
        openings: [],
      },
    ];
  }

  private static createDoors(): DoorDef[] {
    return [
      {
        id: 'door-entry',
        wallOpeningId: 'wall-south',
        hinge: 'left',
        openAngleDeg: 100,
        startsOpen: false,
      },
      {
        id: 'door-bathroom',
        wallOpeningId: 'wall-divider-long',
        hinge: 'right',
        openAngleDeg: 90,
        startsOpen: false,
      },
    ];
  }

  private static createFurniture(): FurnitureDef[] {
    return [
      // Living Room
      {
        id: 'sofa',
        name: '2-seat sofa',
        roomId: 'living',
        visual: {
          shape: 'box',
          size: { x: 1.8, y: 0.8, z: 0.8 },
          position: { x: 1.0, y: 0, z: 1.0 },
          rotationY: 0,
          colorHex: FABRIC_SOFA,
          materialHint: 'fabric',
        },
      },
      {
        id: 'coffee-table',
        name: 'Coffee table',
        roomId: 'living',
        visual: {
          shape: 'box',
          size: { x: 0.9, y: 0.4, z: 0.5 },
          position: { x: 1.0, y: 0, z: 2.2 },
          rotationY: 0,
          colorHex: WOOD_FURNITURE,
          materialHint: 'wood',
        },
      },
      {
        id: 'tv-stand',
        name: 'TV console',
        roomId: 'living',
        visual: {
          shape: 'box',
          size: { x: 1.2, y: 0.5, z: 0.4 },
          position: { x: 1.0, y: 0, z: 3.6 },
          rotationY: 0,
          colorHex: WOOD_FURNITURE,
          materialHint: 'wood',
        },
      },
      {
        id: 'dining-table',
        name: 'Dining table',
        roomId: 'living',
        visual: {
          shape: 'box',
          size: { x: 1.0, y: 0.75, z: 1.0 },
          position: { x: 3.6, y: 0, z: 1.2 },
          rotationY: 0,
          colorHex: WOOD_FURNITURE,
          materialHint: 'wood',
        },
      },
      {
        id: 'dining-chair-1',
        name: 'Chair',
        roomId: 'living',
        visual: {
          shape: 'box',
          size: { x: 0.4, y: 0.9, z: 0.4 },
          position: { x: 3.6, y: 0, z: 0.6 },
          rotationY: 0,
          colorHex: WOOD_FURNITURE,
          materialHint: 'wood',
        },
      },
      {
        id: 'dining-chair-2',
        name: 'Chair',
        roomId: 'living',
        visual: {
          shape: 'box',
          size: { x: 0.4, y: 0.9, z: 0.4 },
          position: { x: 3.6, y: 0, z: 1.8 },
          rotationY: Math.PI,
          colorHex: WOOD_FURNITURE,
          materialHint: 'wood',
        },
      },
      {
        id: 'kitchen-counter',
        name: 'Counter run',
        roomId: 'living',
        visual: {
          shape: 'box',
          size: { x: 3.0, y: 0.9, z: 0.6 },
          position: { x: 1.5, y: 0, z: 5.3 },
          rotationY: 0,
          colorHex: METAL_ACCENT,
          materialHint: 'metal',
        },
      },
      {
        id: 'fridge',
        name: 'Refrigerator',
        roomId: 'living',
        visual: {
          shape: 'box',
          size: { x: 0.7, y: 1.8, z: 0.7 },
          position: { x: 3.6, y: 0, z: 5.25 },
          rotationY: 0,
          colorHex: METAL_ACCENT,
          materialHint: 'metal',
        },
      },
      {
        id: 'rug-living',
        name: 'Area rug',
        roomId: 'living',
        visual: {
          shape: 'box',
          size: { x: 2.0, y: 0.02, z: 1.4 },
          position: { x: 1.2, y: 0, z: 1.6 },
          rotationY: 0,
          colorHex: '#C9B79C',
        },
        decorative: true,
      },

      // Bedroom
      {
        id: 'bed',
        name: 'Double bed',
        roomId: 'bedroom',
        visual: {
          shape: 'box',
          size: { x: 1.6, y: 0.6, z: 2.0 },
          position: { x: 6.0, y: 0, z: 4.8 },
          rotationY: 0,
          colorHex: '#E7DFD3',
        },
      },
      {
        id: 'nightstand',
        name: 'Nightstand',
        roomId: 'bedroom',
        visual: {
          shape: 'box',
          size: { x: 0.4, y: 0.5, z: 0.4 },
          position: { x: 5.15, y: 0, z: 4.8 },
          rotationY: 0,
          colorHex: WOOD_FURNITURE,
          materialHint: 'wood',
        },
      },
      {
        id: 'wardrobe',
        name: 'Wardrobe',
        roomId: 'bedroom',
        visual: {
          shape: 'box',
          size: { x: 1.2, y: 2.0, z: 0.6 },
          position: { x: 6.6, y: 0, z: 3.0 },
          rotationY: 0,
          colorHex: WOOD_FURNITURE,
          materialHint: 'wood',
        },
      },
      {
        id: 'rug-bed',
        name: 'Rug',
        roomId: 'bedroom',
        visual: {
          shape: 'box',
          size: { x: 1.2, y: 0.02, z: 0.8 },
          position: { x: 6.0, y: 0, z: 3.8 },
          rotationY: 0,
          colorHex: '#C9B79C',
        },
        decorative: true,
      },

      // Bathroom
      {
        id: 'sink',
        name: 'Vanity sink',
        roomId: 'bathroom',
        visual: {
          shape: 'box',
          size: { x: 0.6, y: 0.85, z: 0.45 },
          position: { x: 5.3, y: 0, z: 0.45 },
          rotationY: 0,
          colorHex: METAL_ACCENT,
          materialHint: 'metal',
        },
      },
      {
        id: 'toilet',
        name: 'Toilet',
        roomId: 'bathroom',
        visual: {
          shape: 'box',
          size: { x: 0.4, y: 0.4, z: 0.6 },
          position: { x: 6.9, y: 0, z: 0.5 },
          rotationY: 0,
          colorHex: '#F2F2F0',
        },
      },
      {
        id: 'shower',
        name: 'Shower stall',
        roomId: 'bathroom',
        visual: {
          shape: 'box',
          size: { x: 0.9, y: 2.0, z: 0.9 },
          position: { x: 6.75, y: 0, z: 1.85 },
          rotationY: 0,
          colorHex: GLASS_WINDOW,
          materialHint: 'glass',
        },
      },
    ];
  }

  private static createMarkers(): MarkerPoint[] {
    return [
      {
        id: 'spawn-default',
        kind: 'spawn',
        roomId: 'living',
        position: { x: 2.4, y: 0, z: 2.8 },
        lookAt: { x: 2.4, y: 1.6, z: 5.6 },
        label: 'Default start (living room)',
      },
      {
        id: 'stand-tv',
        kind: 'camera-stand',
        roomId: 'living',
        position: { x: 1.0, y: 0.55, z: 4.3 },
        lookAt: { x: 1.5, y: 1.4, z: 1.0 },
        label: 'TV stand',
      },
      {
        id: 'stand-kitchen',
        kind: 'camera-stand',
        roomId: 'living',
        position: { x: 2.0, y: 1.05, z: 4.9 },
        lookAt: { x: 2.5, y: 1.5, z: 2.0 },
        label: 'Kitchen counter',
      },
      {
        id: 'stand-nightstand',
        kind: 'camera-stand',
        roomId: 'bedroom',
        position: { x: 5.15, y: 1.05, z: 4.8 },
        lookAt: { x: 6.5, y: 1.4, z: 4.8 },
        label: 'Bedroom nightstand',
      },
      {
        id: 'stand-bath-shelf',
        kind: 'camera-stand',
        roomId: 'bathroom',
        position: { x: 5.0, y: 1.5, z: 0.2 },
        lookAt: { x: 6.0, y: 1.2, z: 1.2 },
        label: 'Bathroom shelf',
      },
    ];
  }

  private static createLights(): LightDef[] {
    return [
      {
        id: 'light-ambient',
        type: 'hemisphere',
        intensity: 0.6,
        color: WALL_PAINT,
      },
      {
        id: 'light-window-living',
        type: 'directional',
        position: { x: 2.4, y: 3, z: 5.8 },
        target: { x: 2.4, y: 1, z: 2.8 },
        intensity: 0.8,
      },
      {
        id: 'light-window-bedroom',
        type: 'directional',
        position: { x: 6.0, y: 3, z: 5.8 },
        target: { x: 6.0, y: 1, z: 4.0 },
        intensity: 0.8,
      },
      {
        id: 'light-window-bathroom',
        type: 'directional',
        position: { x: 6.0, y: 3, z: -0.2 },
        target: { x: 6.0, y: 1, z: 1.2 },
        intensity: 0.8,
      },
      {
        id: 'light-room-living',
        type: 'point',
        position: { x: 2.4, y: 2.4, z: 2.8 },
        intensity: 0.5,
      },
      {
        id: 'light-room-bedroom',
        type: 'point',
        position: { x: 6.0, y: 2.4, z: 4.0 },
        intensity: 0.5,
      },
      {
        id: 'light-room-bathroom',
        type: 'point',
        position: { x: 6.0, y: 2.4, z: 1.2 },
        intensity: 0.5,
      },
    ];
  }

  static buildThreeScene(def: ApartmentDef, showCeiling = false): THREE.Group {
    const root = new THREE.Group();
    root.name = 'apartment-scene';

    // Build floors and ceilings
    for (const room of def.rooms) {
      this.buildFloor(root, room);
      if (showCeiling) {
        this.buildCeiling(root, room);
      }
    }

    // Build walls
    for (const wall of def.walls) {
      this.buildWall(root, wall);
    }

    // Build furniture
    for (const furn of def.furniture) {
      this.buildFurniture(root, furn);
    }

    // Build doors (visual only, collision handled by physics)
    for (const door of def.doors) {
      this.buildDoor(root, door, def);
    }

    // Build lights
    for (const light of def.lights) {
      this.buildLight(root, light);
    }

    return root;
  }

  private static buildFloor(parent: THREE.Group, room: RoomDef) {
    const { bounds } = room;
    const geo = new THREE.PlaneGeometry(
      bounds.halfExtents.x * 2,
      bounds.halfExtents.z * 2
    );
    const mat = new THREE.MeshStandardMaterial({
      color: this.getMaterialColor(room.floorMaterialId),
      roughness: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(bounds.center.x, 0.01, bounds.center.z);
    mesh.name = `floor-${room.id}`;
    parent.add(mesh);
  }

  private static buildCeiling(parent: THREE.Group, room: RoomDef) {
    const { bounds, ceilingHeight } = room;
    const geo = new THREE.PlaneGeometry(
      bounds.halfExtents.x * 2,
      bounds.halfExtents.z * 2
    );
    const mat = new THREE.MeshStandardMaterial({
      color: this.getMaterialColor('wall-paint'),
      roughness: 0.8,
      side: THREE.BackSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(bounds.center.x, ceilingHeight - 0.01, bounds.center.z);
    mesh.name = `ceiling-${room.id}`;
    mesh.visible = false; // default hidden
    parent.add(mesh);
  }

  private static buildWall(parent: THREE.Group, wall: WallSegment) {
    const dx = wall.to.x - wall.from.x;
    const dz = wall.to.z - wall.from.z;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);

    const segments = this.computeWallSegments(wall, length);

    for (let i = 0; i < segments.length; i++) {
      const [midPoint, segLen] = segments[i];
      const x = wall.from.x + (dx / length) * midPoint;
      const z = wall.from.z + (dz / length) * midPoint;

      const geo = new THREE.BoxGeometry(segLen, wall.height, wall.thickness);
      const mat = new THREE.MeshStandardMaterial({
        color: this.getMaterialColor('wall-paint'),
        roughness: 0.8,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, wall.height / 2, z);
      mesh.rotation.y = angle;
      mesh.name = `wall-${wall.id}-seg${i}`;
      parent.add(mesh);
    }
  }

  private static computeWallSegments(
    wall: WallSegment,
    length: number
  ): [number, number][] {
    const segments: [number, number][] = [];
    let current = 0;

    const sorted = [...wall.openings].sort((a, b) => a.from - b.from);

    for (const opening of sorted) {
      if (opening.from > current) {
        const segLen = opening.from - current;
        const mid = current + segLen / 2;
        segments.push([mid, segLen]);
      }
      current = opening.to;
    }

    if (current < length) {
      const segLen = length - current;
      const mid = current + segLen / 2;
      segments.push([mid, segLen]);
    }

    return segments;
  }

  private static buildFurniture(parent: THREE.Group, furn: FurnitureDef) {
    const { visual } = furn;
    const geo = new THREE.BoxGeometry(visual.size.x, visual.size.y, visual.size.z);
    const mat = new THREE.MeshStandardMaterial({
      color: visual.colorHex,
      roughness: visual.materialHint === 'metal' ? 0.2 : 0.8,
      metalness: visual.materialHint === 'metal' ? 1.0 : 0.0,
      transparent: visual.materialHint === 'glass',
      opacity: visual.materialHint === 'glass' ? 0.35 : 1.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(visual.position.x, visual.position.y + visual.size.y / 2, visual.position.z);
    mesh.rotation.y = visual.rotationY;
    mesh.name = `furn-${furn.id}`;
    if (furn.decorative) {
      mesh.name += '_deco';
    }
    parent.add(mesh);
  }

  private static buildDoor(parent: THREE.Group, door: DoorDef, def: ApartmentDef) {
    // Find the wall opening
    const wall = def.walls.find((w) =>
      w.openings.some((o) => o.doorId === door.id)
    );
    if (!wall) return;

    // Door geometry: thin box
    const width = 0.9; // standard door width
    const height = 2.0;
    const thickness = 0.05;

    const geo = new THREE.BoxGeometry(width, height, thickness);
    const mat = new THREE.MeshStandardMaterial({
      color: WOOD_FURNITURE,
      roughness: 0.6,
    });
    const doorMesh = new THREE.Mesh(geo, mat);
    doorMesh.name = `door-mesh-${door.id}`;

    // Create pivot point (Object3D) at the hinge
    const dx = wall.to.x - wall.from.x;
    const dz = wall.to.z - wall.from.z;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);

    // Find the opening on this wall
    const opening = wall.openings.find((o) => o.doorId === door.id)!;
    const hinge = wall.from.x + (dx / length) * opening.from;
    const hingez = wall.from.z + (dz / length) * opening.from;

    const pivot = new THREE.Object3D();
    pivot.position.set(hinge, height / 2, hingez);
    pivot.rotation.y = angle;
    pivot.name = `door-pivot-${door.id}`;

    // Offset door mesh from pivot based on hinge side
    const offset = door.hinge === 'left' ? width / 2 : -width / 2;
    doorMesh.position.z = offset;

    pivot.add(doorMesh);
    parent.add(pivot);

    // Store door state for physics/animation
    (pivot as any).__doorDef = { ...door, pivotPos: pivot.position };
  }

  private static buildLight(parent: THREE.Group, light: LightDef) {
    let threeLight: THREE.Light;

    switch (light.type) {
      case 'hemisphere': {
        threeLight = new THREE.HemisphereLight(light.color || '#ffffff', '#000000', light.intensity);
        break;
      }
      case 'directional': {
        const dirLight = new THREE.DirectionalLight('#ffffff', light.intensity);
        if (light.position) {
          dirLight.position.set(light.position.x, light.position.y, light.position.z);
        }
        if (light.target) {
          dirLight.target.position.set(light.target.x, light.target.y, light.target.z);
          parent.add(dirLight.target);
        }
        threeLight = dirLight;
        break;
      }
      case 'point': {
        threeLight = new THREE.PointLight('#ffffff', light.intensity, 4);
        if (light.position) {
          threeLight.position.set(light.position.x, light.position.y, light.position.z);
        }
        break;
      }
    }

    threeLight.name = light.id;
    parent.add(threeLight);
  }

  private static getMaterialColor(materialId: string): string {
    const colors: Record<string, string> = {
      'floor-oak': FLOOR_OAK,
      'floor-carpet': FLOOR_CARPET,
      'floor-tile': FLOOR_TILE,
      'wall-paint': WALL_PAINT,
      'wood-furniture': WOOD_FURNITURE,
      'fabric-sofa': FABRIC_SOFA,
      'metal-accent': METAL_ACCENT,
      'glass-window': GLASS_WINDOW,
    };
    return colors[materialId] || '#cccccc';
  }
}
