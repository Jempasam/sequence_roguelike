import type { Painter, Sprite, Texture } from "../gpu"
import { MAX_VERTICES, Primitive, RAW_VERTEX_SIZE } from "../gpu"
import { ParticleSpec } from "./ParticleSpec"

/** The longest step `update` simulates at once, in seconds: a long pause does not throw the particles far. */
const MAX_STEP = 0.05

/** The most particles one draw holds, so a draw stays under the vertex limit. */
const CHUNK = Math.min(4096, Math.floor(MAX_VERTICES / 4))

/** How particles are drawn. */
export interface ParticleDrawOptions {
    /** The white texels the squares are drawn with. The white texel of the GPU by default. */
    readonly white?: Sprite

    /** How the particles blend: `"alpha"` by default. */
    readonly blend?: "alpha"|"additive"
}

/** The zone the living particles reach, in pixels. Empty when `left > right`. */
export interface ParticleBounds {
    left: number
    top: number
    right: number
    bottom: number
}

// FIELDS //

const X = 0
const Y = 1
const VX = 2
const VY = 3
const AX = 4
const AY = 5
const DRAG = 6
const AGE = 7
const LIFE = 8
const SIZE_START = 9
const SIZE_END = 10
const R0 = 11
const G0 = 12
const B0 = 13
const A0 = 14
const R1 = 15
const G1 = 16
const B1 = 17
const A1 = 18
const ROTATION = 19
const SPIN = 20
const FACE = 21
const STRIDE = 22

/**
 * Simulates and draws particles: small squares or sprites that move under a force, slow down, shrink or
 * fade, and die. It is only a display: nothing here feeds the simulation of the game.
 *
 * @remarks
 * Everything is allocated by the constructor. The particles live in one array of numbers, a dead one is
 * replaced by the last living one, and a draw fills a vertex buffer reused every frame, so a frame
 * allocates nothing. At `maxParticles`, a new particle is dropped.
 *
 * It is sized for a few hundred particles: measured with a fake context, 512 particles take about 0.4 ms
 * to update and draw, 4096 take about 8 ms, most of it in `Painter.draw` validating and copying vertices.
 */
export class ParticleSystem {

    /** A spec the emitters reset and fill for each particle they emit. */
    public readonly scratch = new ParticleSpec()

    /** The zone the living particles reach, kept up to date by `emit` and `update`. Empty when none. */
    public readonly bounds: ParticleBounds = {
        left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity,
    }

    readonly #data: Float32Array
    readonly #sprites: (Sprite|null)[]
    readonly #ids: Int32Array
    #nextId = 1
    readonly #vertices: Float32Array
    readonly #indices: Uint16Array
    readonly #textures: Texture[] = []
    #count = 0

    /** The white texels the squares are drawn with, none for the white texel of the GPU. */
    public readonly white: Sprite|null

    /** How the particles blend. */
    public readonly blend: "alpha"|"additive"

    /** @param maxParticles - The most particles alive at once. */
    constructor(public readonly maxParticles: number, options: ParticleDrawOptions = {}) {
        if(!Number.isInteger(maxParticles) || maxParticles < 1){
            throw new Error(`A particle system holds at least one particle, not ${maxParticles}.`)
        }
        this.white = options.white ?? null
        this.blend = options.blend ?? "alpha"
        this.#data = new Float32Array(maxParticles * STRIDE)
        this.#sprites = new Array<Sprite|null>(maxParticles).fill(null)
        this.#ids = new Int32Array(maxParticles)
        const chunk = Math.min(CHUNK, maxParticles)
        this.#vertices = new Float32Array(chunk * 4 * RAW_VERTEX_SIZE)
        this.#indices = new Uint16Array(chunk * 6)
        for(let i = 0; i < chunk; i++){
            const v = i * 4
            this.#indices.set([v, v + 1, v + 2, v, v + 2, v + 3], i * 6)
        }
    }


    // STATE //

    /** The number of living particles. */
    public get count(): number {
        return this.#count
    }

    /** Remove every particle. */
    public clear(): void {
        this.#sprites.fill(null, 0, this.#count)
        this.#count = 0
        this.#resetBounds()
    }


    // EMIT //

    /**
     * Add a particle described by a spec, copied: the spec can be filled again right after.
     * Does nothing when the system is full.
     *
     * @returns The handle of the particle, that {@link steer} and {@link isAlive} take, which no other
     * particle ever has, or 0 when the system is full.
     */
    public emit(spec: ParticleSpec): number {
        if(this.#count >= this.maxParticles) return 0
        const d = this.#data
        const o = this.#count * STRIDE
        d[o + X] = spec.x
        d[o + Y] = spec.y
        d[o + VX] = spec.vx
        d[o + VY] = spec.vy
        d[o + AX] = spec.ax
        d[o + AY] = spec.ay
        d[o + DRAG] = spec.drag
        d[o + AGE] = 0
        d[o + LIFE] = Math.max(spec.life, 1e-6)
        d[o + SIZE_START] = spec.sizeStart
        d[o + SIZE_END] = spec.sizeEnd
        d[o + R0] = spec.colorStart.r
        d[o + G0] = spec.colorStart.g
        d[o + B0] = spec.colorStart.b
        d[o + A0] = spec.colorStart.a
        d[o + R1] = spec.colorEnd.r
        d[o + G1] = spec.colorEnd.g
        d[o + B1] = spec.colorEnd.b
        d[o + A1] = spec.colorEnd.a
        d[o + ROTATION] = spec.rotation
        d[o + SPIN] = spec.spin
        d[o + FACE] = spec.faceMotion ? 1 : 0
        this.#sprites[this.#count] = spec.sprite
        const id = this.#nextId++ & 0x7fffffff || 1
        this.#ids[this.#count] = id
        this.#grow(this.#count)
        this.#count++
        return id
    }

    /** Is the particle of this handle still alive? */
    public isAlive(handle: number): boolean {
        return this.#indexOf(handle) >= 0
    }

    /**
     * Drive a living particle: give it the speed that takes it to a point in a given time, and an opacity.
     * Its acceleration and drag are cleared, so only the next steers act on it.
     *
     * @param handle - What {@link emit} returned.
     * @param x - Where to be after `within` seconds, in pixels.
     * @param y - Where to be after `within` seconds, in pixels.
     * @param within - The time to get there, in seconds, above 0.
     * @param opacity - The alpha of the particle from now on, from 0 to 1, kept for its whole life.
     * @returns False when the particle is dead: it died of old age, or was never emitted.
     */
    public steer(handle: number, x: number, y: number, within: number, opacity: number): boolean {
        const index = this.#indexOf(handle)
        if(index < 0) return false
        const d = this.#data
        const o = index * STRIDE
        const time = Math.max(within, 1e-6)
        d[o + VX] = (x - d[o + X]) / time
        d[o + VY] = (y - d[o + Y]) / time
        d[o + AX] = 0
        d[o + AY] = 0
        d[o + DRAG] = 0
        d[o + A0] = opacity
        d[o + A1] = opacity
        return true
    }

    /** The position of a living particle, written into `out`, or false when the index is not one. */
    public positionOf(index: number, out: { x: number, y: number }): boolean {
        if(!(index >= 0 && index < this.#count)) return false
        out.x = this.#data[index * STRIDE + X]
        out.y = this.#data[index * STRIDE + Y]
        return true
    }


    // UPDATE //

    /**
     * Move every particle on, and remove the ones that reached the end of their life.
     *
     * @param dt - The time since the last update, in seconds, cut to 50 ms.
     */
    public update(dt: number): void {
        if(this.#count === 0) return

        // STEP //
        const step = Math.min(Math.max(dt, 0), MAX_STEP)
        const d = this.#data
        this.#resetBounds()
        let i = 0

        // PARTICLES //
        while(i < this.#count){
            const o = i * STRIDE
            d[o + AGE] += step
            if(d[o + AGE] >= d[o + LIFE]){
                this.#removeAt(i)
                continue
            }
            const keep = Math.exp(-d[o + DRAG] * step)
            const vx = (d[o + VX] + d[o + AX] * step) * keep
            const vy = (d[o + VY] + d[o + AY] * step) * keep
            d[o + VX] = vx
            d[o + VY] = vy
            const x = d[o + X] + vx * step
            const y = d[o + Y] + vy * step
            d[o + X] = x
            d[o + Y] = y

            this.#grow(i)
            i++
        }
    }

    /** Extend the bounds with what a particle can reach, a turned quad included. */
    #grow(index: number): void {
        const d = this.#data
        const o = index * STRIDE
        const sprite = this.#sprites[index]
        const ratio = sprite === null ? 1 : sprite.height / sprite.width
        const half = Math.max(d[o + SIZE_START], d[o + SIZE_END]) / 2 * Math.hypot(1, ratio)
        const bounds = this.bounds
        if(d[o + X] - half < bounds.left) bounds.left = d[o + X] - half
        if(d[o + Y] - half < bounds.top) bounds.top = d[o + Y] - half
        if(d[o + X] + half > bounds.right) bounds.right = d[o + X] + half
        if(d[o + Y] + half > bounds.bottom) bounds.bottom = d[o + Y] + half
    }


    // DRAW //

    /**
     * Draw every particle. Squares share one draw, sprites one per texture.
     *
     * @param painter - Where to draw. Its tint and transform apply to every particle. The blend is the one of
     * the system, not the one of the painter: the default one of a painter, `"cutout"`, would discard the
     * fading particles.
     * @param offsetX - Added to every position, in pixels.
     * @param offsetY - Added to every position, in pixels.
     */
    public draw(painter: Painter, offsetX = 0, offsetY = 0): void {
        if(this.#count === 0) return
        painter.push()
        painter.setBlend(this.blend)
        this.#drawAll(painter, offsetX, offsetY)
        painter.pop()
    }

    #drawAll(painter: Painter, offsetX: number, offsetY: number): void {

        // SQUARES //
        const white = this.white ?? painter.gpu.white
        this.#drawGroup(painter, offsetX, offsetY, white.texture, white, null)

        // SPRITES //
        const textures = this.#textures
        textures.length = 0
        for(let i = 0; i < this.#count; i++){
            const sprite = this.#sprites[i]
            if(sprite !== null && !textures.includes(sprite.texture)) textures.push(sprite.texture)
        }
        for(const texture of textures) this.#drawGroup(painter, offsetX, offsetY, texture, null, texture)
        textures.length = 0
    }

    /** Draw the particles of one texture: the squares when `white` is given, else the sprites of it. */
    #drawGroup(
        painter: Painter, offsetX: number, offsetY: number, texture: Texture, white: Sprite|null,
        spriteTexture: Texture|null,
    ): void {
        const d = this.#data
        const vertices = this.#vertices
        const chunk = this.#indices.length / 6
        let filled = 0
        for(let i = 0; i < this.#count; i++){
            const sprite = this.#sprites[i]
            const isSquare = sprite === null
            if(white !== null ? !isSquare : isSquare || sprite.texture !== spriteTexture) continue
            const o = i * STRIDE
            const share = d[o + AGE] / d[o + LIFE]
            const size = d[o + SIZE_START] + (d[o + SIZE_END] - d[o + SIZE_START]) * share
            if(size <= 0) continue

            // SHAPE //
            const source = white ?? sprite as Sprite
            const halfWidth = size / 2
            const halfHeight = white !== null ? halfWidth : halfWidth * source.height / source.width
            let cos = 1
            let sin = 0
            if(d[o + FACE] === 1){
                const vx = d[o + VX]
                const vy = d[o + VY]
                const speed = Math.hypot(vx, vy)
                if(speed > 1e-9){
                    cos = vx / speed
                    sin = vy / speed
                }
            }
            else if(d[o + ROTATION] !== 0 || d[o + SPIN] !== 0){
                const angle = d[o + ROTATION] + d[o + SPIN] * d[o + AGE]
                cos = Math.cos(angle)
                sin = Math.sin(angle)
            }
            const cx = d[o + X] + offsetX
            const cy = d[o + Y] + offsetY

            // TEXTURE //
            let u0: number
            let v0: number
            let u1: number
            let v1: number
            if(white !== null){
                u0 = u1 = white.x + (white.width >> 1)
                v0 = v1 = white.y + (white.height >> 1)
            }
            else {
                u0 = source.x
                v0 = source.y
                u1 = u0 + source.width
                v1 = v0 + source.height
            }

            // COLOR //
            const r = d[o + R0] + (d[o + R1] - d[o + R0]) * share
            const g = d[o + G0] + (d[o + G1] - d[o + G0]) * share
            const b = d[o + B0] + (d[o + B1] - d[o + B0]) * share
            const a = d[o + A0] + (d[o + A1] - d[o + A0]) * share

            // VERTICES //
            let w = filled * 4 * RAW_VERTEX_SIZE
            for(let corner = 0; corner < 4; corner++){
                const lx = corner === 0 || corner === 3 ? -halfWidth : halfWidth
                const ly = corner < 2 ? -halfHeight : halfHeight
                vertices[w++] = cx + lx * cos - ly * sin
                vertices[w++] = cy + lx * sin + ly * cos
                vertices[w++] = 0
                vertices[w++] = corner === 0 || corner === 3 ? u0 : u1
                vertices[w++] = corner < 2 ? v0 : v1
                vertices[w++] = r
                vertices[w++] = g
                vertices[w++] = b
                vertices[w++] = a
            }
            filled++
            if(filled === chunk){
                this.#flush(painter, texture, filled)
                filled = 0
            }
        }
        if(filled > 0) this.#flush(painter, texture, filled)
    }

    /** Send the first `filled` particles of the buffer to the painter. */
    #flush(painter: Painter, texture: Texture, filled: number): void {
        const isFull = filled === this.#indices.length / 6
        const vertices = isFull ? this.#vertices : this.#vertices.subarray(0, filled * 4 * RAW_VERTEX_SIZE)
        const indices = isFull ? this.#indices : this.#indices.subarray(0, filled * 6)
        painter.draw(vertices, indices, texture, Primitive.TRIANGLES)
    }


    // INTERNALS //

    /** Where the particle of a handle lies in the arrays, or -1 when it is not alive. */
    #indexOf(handle: number): number {
        if(handle <= 0) return -1
        for(let i = 0; i < this.#count; i++) if(this.#ids[i] === handle) return i
        return -1
    }

    /** Replace a particle by the last living one. */
    #removeAt(index: number): void {
        const last = this.#count - 1
        if(index !== last){
            this.#data.copyWithin(index * STRIDE, last * STRIDE, last * STRIDE + STRIDE)
            this.#sprites[index] = this.#sprites[last]
            this.#ids[index] = this.#ids[last]
        }
        this.#sprites[last] = null
        this.#count = last
    }

    #resetBounds(): void {
        const bounds = this.bounds
        bounds.left = Infinity
        bounds.top = Infinity
        bounds.right = -Infinity
        bounds.bottom = -Infinity
    }
}
