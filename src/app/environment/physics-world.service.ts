/**
 * V-Me Physics World Service
 * cannon-es integration for collision, movement, and physics stepping.
 * Ref: Environment Addendum §19.7.2 [v1.1+]
 */

import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { ApartmentDef, Vec3, WallSegment } from './environment.models';

const PLAYER_RADIUS = 0.3;
const PLAYER_MASS = 5;

export class PhysicsWorldService {
  private world: CANNON.World;
  private playerBody: CANNON.Body;
  private bodies: Map<string, CANNON.Body> = new Map();
  private doorBodies: Map<string, CANNON.Body> = new Map(); // open/close tracking
  private debugMeshes: Map<string, THREE.Mesh> = new Map();

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.defaultContactMaterial.friction = 0.1;
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);

    // Create player body (sphere)
    const playerShape = new CANNON.Sphere(PLAYER_RADIUS);
    this.playerBody = new CANNON.Body({
      mass: PLAYER_MASS,
      shape: playerShape,
      linearDamping: 0.1,
      fixedRotation: true,
    });
    this.playerBody.position.set(2.4, 1, 2.8); // default spawn
    this.world.addBody(this.playerBody);
  }

  buildApartmentColliders(apartment: ApartmentDef): void {
    // Floor planes per room
    for (const room of apartment.rooms) {
      const floorShape = new CANNON.Plane();
      const floorBody = new CANNON.Body({ mass: 0, shape: floorShape });
      floorBody.position.set(room.bounds.center.x, 0, room.bounds.center.z);
      this.world.addBody(floorBody);
      this.bodies.set(`floor-${room.id}`, floorBody);
    }

    // Wall colliders
    for (const wall of apartment.walls) {
      const dx = wall.to.x - wall.from.x;
      const dz = wall.to.z - wall.from.z;
      const length = Math.hypot(dx, dz);
      const angle = Math.atan2(dz, dx);

      const segments = this.computeWallSegments(wall, length);

      for (let i = 0; i < segments.length; i++) {
        const [midPoint, segLen] = segments[i];
        const x = wall.from.x + (dx / length) * midPoint;
        const z = wall.from.z + (dz / length) * midPoint;

        const halfW = segLen / 2;
        const halfH = wall.height / 2;
        const halfT = wall.thickness / 2;

        const shape = new CANNON.Box(
          new CANNON.Vec3(halfW, halfH, halfT)
        );
        const body = new CANNON.Body({ mass: 0, shape });
        body.position.set(x, halfH, z);

        // Apply rotation to body
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
        body.quaternion = quat;

        this.world.addBody(body);
        this.bodies.set(`wall-${wall.id}-seg${i}`, body);
      }
    }

    // Furniture colliders
    for (const furn of apartment.furniture) {
      if (furn.decorative) continue;

      const { visual } = furn;
      const halfX = visual.size.x / 2;
      const halfY = visual.size.y / 2;
      const halfZ = visual.size.z / 2;

      const shape = new CANNON.Box(
        new CANNON.Vec3(halfX, halfY, halfZ)
      );
      const body = new CANNON.Body({ mass: 0, shape });
      body.position.set(
        visual.position.x,
        visual.position.y + halfY,
        visual.position.z
      );

      if (visual.rotationY !== 0) {
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), visual.rotationY);
        body.quaternion = quat;
      }

      this.world.addBody(body);
      this.bodies.set(`furn-${furn.id}`, body);
    }

    // Door colliders (initially for closed doors)
    for (const door of apartment.doors) {
      if (!door.startsOpen) {
        const wall = apartment.walls.find((w) =>
          w.openings.some((o) => o.doorId === door.id)
        );
        if (wall) {
          const opening = wall.openings.find((o) => o.doorId === door.id)!;

          const dx = wall.to.x - wall.from.x;
          const dz = wall.to.z - wall.from.z;
          const length = Math.hypot(dx, dz);
          const angle = Math.atan2(dz, dx);

          const doorX = wall.from.x + (dx / length) * opening.from;
          const doorZ = wall.from.z + (dz / length) * opening.from;

          const doorShape = new CANNON.Box(
            new CANNON.Vec3(0.45, 1, 0.05)
          );
          const doorBody = new CANNON.Body({ mass: 0, shape: doorShape });
          doorBody.position.set(doorX, 1, doorZ);

          const quat = new CANNON.Quaternion();
          quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
          doorBody.quaternion = quat;

          this.world.addBody(doorBody);
          this.doorBodies.set(door.id, doorBody);
        }
      }
    }
  }

  private computeWallSegments(
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

  step(dt: number = 1 / 60): void {
    // Fixed physics tick (1/60s) with the real frame delta as elapsed time,
    // up to 10 substeps to absorb frame-time jitter. (cannon-es signature:
    // world.step(fixedTimeStep, timeSinceLastCalled, maxSubSteps))
    this.world.step(1 / 60, dt, 10);
  }

  setPlayerVelocity(vx: number, vz: number): void {
    this.playerBody.velocity.x = vx;
    this.playerBody.velocity.z = vz;
    // gravity owns velocity.y
  }

  getPlayerPosition(): Vec3 {
    const p = this.playerBody.position;
    return { x: p.x, y: p.y, z: p.z };
  }

  setPlayerPosition(pos: Vec3): void {
    this.playerBody.position.set(pos.x, pos.y, pos.z);
  }

  getPlayerVelocity(): Vec3 {
    const v = this.playerBody.velocity;
    return { x: v.x, y: v.y, z: v.z };
  }

  openDoor(doorId: string): void {
    const doorBody = this.doorBodies.get(doorId);
    if (doorBody) {
      this.world.removeBody(doorBody);
      this.doorBodies.delete(doorId);
    }
  }

  closeDoor(doorId: string, apartment: ApartmentDef): void {
    if (this.doorBodies.has(doorId)) return; // already closed

    const door = apartment.doors.find((d) => d.id === doorId);
    if (!door) return;

    const wall = apartment.walls.find((w) =>
      w.openings.some((o) => o.doorId === door.id)
    );
    if (!wall) return;

    const opening = wall.openings.find((o) => o.doorId === doorId)!;

    const dx = wall.to.x - wall.from.x;
    const dz = wall.to.z - wall.from.z;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);

    const doorX = wall.from.x + (dx / length) * opening.from;
    const doorZ = wall.from.z + (dz / length) * opening.from;

    const doorShape = new CANNON.Box(new CANNON.Vec3(0.45, 1, 0.05));
    const doorBody = new CANNON.Body({ mass: 0, shape: doorShape });
    doorBody.position.set(doorX, 1, doorZ);

    const quat = new CANNON.Quaternion();
    quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
    doorBody.quaternion = quat;

    this.world.addBody(doorBody);
    this.doorBodies.set(doorId, doorBody);
  }

  createDebugVisualization(): THREE.Group {
    const debugGroup = new THREE.Group();
    debugGroup.name = 'physics-debug';

    const debugMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });

    // Visualize all bodies
    this.bodies.forEach((body, key) => {
      const geo = this.createGeometryFromShape(body.shapes[0]);
      if (geo) {
        const mesh = new THREE.Mesh(geo, debugMat);
        mesh.position.copy(body.position as any);
        mesh.quaternion.copy(body.quaternion as any);
        mesh.name = `debug-${key}`;
        debugGroup.add(mesh);
        this.debugMeshes.set(key, mesh);
      }
    });

    // Player sphere
    const playerGeo = new THREE.SphereGeometry(PLAYER_RADIUS, 8, 8);
    const playerMesh = new THREE.Mesh(playerGeo, debugMat);
    playerMesh.name = 'debug-player';
    debugGroup.add(playerMesh);
    this.debugMeshes.set('player', playerMesh);

    // Doors
    this.doorBodies.forEach((body, key) => {
      const geo = this.createGeometryFromShape(body.shapes[0]);
      if (geo) {
        const mesh = new THREE.Mesh(geo, debugMat);
        mesh.position.copy(body.position as any);
        mesh.quaternion.copy(body.quaternion as any);
        mesh.name = `debug-door-${key}`;
        debugGroup.add(mesh);
        this.debugMeshes.set(`door-${key}`, mesh);
      }
    });

    return debugGroup;
  }

  updateDebugVisualization(): void {
    this.bodies.forEach((body, key) => {
      const mesh = this.debugMeshes.get(key);
      if (mesh) {
        mesh.position.copy(body.position as any);
        mesh.quaternion.copy(body.quaternion as any);
      }
    });

    const playerMesh = this.debugMeshes.get('player');
    if (playerMesh) {
      playerMesh.position.copy(this.playerBody.position as any);
    }

    this.doorBodies.forEach((body, key) => {
      const mesh = this.debugMeshes.get(`door-${key}`);
      if (mesh) {
        mesh.position.copy(body.position as any);
        mesh.quaternion.copy(body.quaternion as any);
      }
    });
  }

  private createGeometryFromShape(shape: CANNON.Shape): THREE.BufferGeometry | null {
    if (shape instanceof CANNON.Box) {
      const s = shape as any;
      return new THREE.BoxGeometry(s.halfExtents.x * 2, s.halfExtents.y * 2, s.halfExtents.z * 2);
    } else if (shape instanceof CANNON.Sphere) {
      const s = shape as any;
      return new THREE.SphereGeometry(s.radius, 8, 8);
    } else if (shape instanceof CANNON.Plane) {
      return new THREE.PlaneGeometry(10, 10);
    }
    return null;
  }

  clearEnvironment(): void {
    // Remove all bodies except player
    this.bodies.forEach((body) => {
      this.world.removeBody(body);
    });
    this.bodies.clear();

    this.doorBodies.forEach((body) => {
      this.world.removeBody(body);
    });
    this.doorBodies.clear();

    this.debugMeshes.clear();
  }

  dispose(): void {
    this.clearEnvironment();
    this.world.removeBody(this.playerBody);
  }
}
