/**
 * @packageDocumentation
 * Particles, only displayed: a {@link ParticleSystem} simulates and draws squares or sprites that move,
 * slow down, shrink, fade and die, each described by a {@link ParticleSpec}. The emitters ({@link burst},
 * {@link emitInside}, {@link emitAlong}, {@link emitOutline}) are plain functions that fill the system. The
 * random numbers are given by the caller and never come from the simulation of the game. {@link follow}
 * and {@link rigid} are animations that lead particles along a path.
 */

export { burst, emitAlong, emitInside, emitOutline, Rate } from "./emitters"
export type { Fill } from "./emitters"
export { MAX_BURST_PARTICLES, ParticleBurst } from "./ParticleBurst"
export type { BurstOptions } from "./ParticleBurst"
export { ParticleSpec } from "./ParticleSpec"
export { motionAt, reachOf } from "./particleMath"
export type { Motion } from "./particleMath"
export { ParticleSystem } from "./ParticleSystem"
export type { ParticleBounds, ParticleDrawOptions } from "./ParticleSystem"
export { follow, rigid } from "./followers"
export type { Follower, Part } from "./followers"
export { pick, pickTwo, seededRandom } from "./random"
export type { Random } from "./random"
