/**
 * Scroll-route physics adapted from Bruno Simon's Folio 2025 physics/object loop.
 * Original project: https://github.com/brunosimon/folio-2025
 * Copyright (c) 2025 Bruno Simon — MIT License.
 *
 * DunaTerp keeps its scroll-constrained route, but uses the same core pattern:
 * Rapier rigid bodies, an event queue for contact forces, and a visual/physical
 * object registry synchronised after every physics step.
 */
import * as RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";

export type RoutePhysicsInput = {
  object: THREE.Object3D;
  home: THREE.Vector3;
  kind?: "algae" | "letter";
  collider?:
    | { type: "ball"; radius: number }
    | { type: "cuboid"; halfExtents: [number, number, number] };
  mass?: number;
  friction?: number;
  restitution?: number;
  linearDamping?: number;
  angularDamping?: number;
  ccd?: boolean;
  sleeping?: boolean;
  eventThreshold?: number;
};

export type RoutePhysicsActor = {
  object: THREE.Object3D;
  home: THREE.Vector3;
  homeRotation: THREE.Quaternion;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  hit: boolean;
  kind: "algae" | "letter";
};

export type RouteImpact = {
  actor: RoutePhysicsActor;
  force: number;
  position: THREE.Vector3;
};

export class RoutePhysics {
  private world: RAPIER.World;
  private eventQueue: RAPIER.EventQueue;
  private vehicleBody: RAPIER.RigidBody;
  private vehicleCollider: RAPIER.Collider;
  private colliderActors = new Map<number, RoutePhysicsActor>();
  readonly actors: RoutePhysicsActor[] = [];

  static async create(
    vehiclePosition: THREE.Vector3,
    vehicleYaw: number,
    objects: RoutePhysicsInput[],
  ) {
    await RAPIER.init();
    return new RoutePhysics(vehiclePosition, vehicleYaw, objects);
  }

  private constructor(
    vehiclePosition: THREE.Vector3,
    vehicleYaw: number,
    objects: RoutePhysicsInput[],
  ) {
    // Folio 2025 Physics.js uses a Rapier world plus a contact-force event
    // queue. The same ordering is retained here in a smaller Wiki-safe loop.
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.eventQueue = new RAPIER.EventQueue(true);
    this.world.timestep = 1 / 60;

    const floorBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.12, 0),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(55, 0.12, 55)
        .setFriction(0.82)
        .setRestitution(0.12),
      floorBody,
    );

    const rotation = this.yawQuaternion(vehicleYaw);
    this.vehicleBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(vehiclePosition.x, 0.72, vehiclePosition.z)
        .setRotation(rotation),
    );
    this.vehicleCollider = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.82, 0.48, 1.18)
        .setTranslation(0, 0.05, 0)
        .setFriction(0.55)
        .setRestitution(0.42)
        .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
        .setContactForceEventThreshold(0.25),
      this.vehicleBody,
    );

    objects.forEach((input) => {
      const { object, home } = input;
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(home.x, home.y, home.z)
          .setRotation(object.quaternion)
          .setLinearDamping(input.linearDamping ?? 0.9)
          .setAngularDamping(input.angularDamping ?? 0.48)
          .setCcdEnabled(input.ccd ?? true)
          .setSleeping(input.sleeping ?? false),
      );
      const colliderShape = input.collider ?? { type: "ball" as const, radius: 0.48 };
      const colliderDesc = colliderShape.type === "cuboid"
        ? RAPIER.ColliderDesc.cuboid(...colliderShape.halfExtents)
        : RAPIER.ColliderDesc.ball(colliderShape.radius);
      if (typeof input.mass === "number") colliderDesc.setMass(input.mass);
      else colliderDesc.setDensity(1);
      const collider = this.world.createCollider(
        colliderDesc
          .setFriction(input.friction ?? 0.76)
          .setRestitution(input.restitution ?? 0.38)
          .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
          .setContactForceEventThreshold(input.eventThreshold ?? 0.25),
        body,
      );
      const actor: RoutePhysicsActor = {
        object,
        home: home.clone(),
        homeRotation: object.quaternion.clone(),
        body,
        collider,
        hit: false,
        kind: input.kind ?? "algae",
      };
      this.actors.push(actor);
      this.colliderActors.set(collider.handle, actor);
    });
  }

  private yawQuaternion(yaw: number) {
    const halfYaw = yaw * 0.5;
    return { x: 0, y: Math.sin(halfYaw), z: 0, w: Math.cos(halfYaw) };
  }

  moveVehicle(position: THREE.Vector3, yaw: number, height: number) {
    this.vehicleBody.setNextKinematicTranslation({
      x: position.x,
      y: 0.72 + height,
      z: position.z,
    });
    this.vehicleBody.setNextKinematicRotation(this.yawQuaternion(yaw));
  }

  step(delta: number) {
    this.world.timestep = Math.min(1 / 30, Math.max(1 / 120, delta));
    this.world.step(this.eventQueue);

    const impacts: RouteImpact[] = [];
    this.eventQueue.drainContactForceEvents((event) => {
      const collider1 = this.world.getCollider(event.collider1());
      const collider2 = this.world.getCollider(event.collider2());
      const vehicleHandle = this.vehicleCollider.handle;
      const actor = collider1.handle === vehicleHandle
        ? this.colliderActors.get(collider2.handle)
        : collider2.handle === vehicleHandle
          ? this.colliderActors.get(collider1.handle)
          : undefined;
      if (!actor) return;

      const force = event.maxForceMagnitude();
      if (force < 0.25 || actor.hit) return;
      actor.hit = true;
      const translation = actor.body.translation();
      const vehicleTranslation = this.vehicleBody.translation();
      const dx = translation.x - vehicleTranslation.x;
      const dz = translation.z - vehicleTranslation.z;
      const distance = Math.max(0.001, Math.hypot(dx, dz));
      if (actor.kind === "algae") {
        const forceRatio = THREE.MathUtils.clamp(force / 120, 0.8, 1.1);
        const vehicleVelocity = this.vehicleBody.linvel();
        const vehicleSpeed = Math.max(0.001, Math.hypot(vehicleVelocity.x, vehicleVelocity.z));
        // The contact remains physically detected, but its outgoing velocity is
        // bounded so algae hop to the roadside instead of leaving the scene.
        actor.body.setLinvel({
          x: (dx / distance) * 1.75 * forceRatio + (vehicleVelocity.x / vehicleSpeed) * 0.55,
          y: 4.6 * forceRatio,
          z: (dz / distance) * 1.75 * forceRatio + (vehicleVelocity.z / vehicleSpeed) * 0.55,
        }, true);
        actor.body.setAngvel({
          x: (dz / distance) * 3.2 * forceRatio,
          y: (dx >= 0 ? -1 : 1) * 3 * forceRatio,
          z: -(dx / distance) * 3.2 * forceRatio,
        }, true);
      }
      impacts.push({
        actor,
        force,
        position: new THREE.Vector3(translation.x, translation.y, translation.z),
      });
    });

    this.actors.forEach((actor) => {
      const position = actor.body.translation();
      const rotation = actor.body.rotation();
      actor.object.position.set(position.x, position.y, position.z);
      actor.object.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      if (position.y < -4) this.resetActor(actor);
    });

    return impacts;
  }

  resetActor(actor: RoutePhysicsActor) {
    actor.body.setTranslation(actor.home, false);
    actor.body.setRotation(actor.homeRotation, false);
    actor.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
    actor.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    actor.body.resetForces(false);
    actor.body.resetTorques(false);
    actor.hit = false;
    actor.object.position.copy(actor.home);
    actor.object.quaternion.copy(actor.homeRotation);
  }

  resetAll() {
    this.actors.forEach((actor) => this.resetActor(actor));
  }

  dispose() {
    this.eventQueue.free();
    this.world.free();
  }
}
