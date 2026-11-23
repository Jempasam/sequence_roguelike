import { Material, MAX_VERTICES, Model, Primitive, RAW_VERTEX_SIZE } from "../gpu"
import type { Gpu, Painter } from "../gpu"
import { burstShaderOf } from "./burstShader"
import type { Fill } from "./emitters"
import type { ParticleBounds, ParticleDrawOptions } from "./ParticleSystem"
import { ParticleSpec } from "./ParticleSpec"
import { reachOf } from "./particleMath"
import type { Random } from "./random"

/** How a burst is drawn, as a system is. */
export type BurstOptions = ParticleDrawOptions

/** The most particles one burst holds: four vertices each, under the vertex limit of a model. */
export const MAX_BURST_PARTICLES = Math.floor(MAX_VERTICES / 4)

/**
 * A burst of particles baked once into a `Model` and animated by its shader: a single draw, and nothing to
 * simulate on the CPU. For an explosion, a hit, a shatter, which nothing changes once it starts.
 *
 * @remarks
 * Every particle of a burst shares its force, drag, sizes, end color, sprite and turn: they are uniforms.
 * They differ by their start position, speed, life and start color, which the vertices hold. {@link create}
 * refuses a `fill` that varies anything else, rather than ignore it in silence.
 *
 * A burst owns GPU buffers: {@link dispose} it once it is done. For particles that keep coming, or that
 * have to change after they started, use a {@link ParticleSystem}.
 */
export class ParticleBurst {

    /** The zone the particles can reach over their whole life, in pixels, known from the start. */
    public readonly bounds: ParticleBounds

    /** The time since the burst started, in seconds. */
    public age = 0

    readonly #model: Model
    readonly #material: Material
    readonly #lifetime: number
    #disposed = false

    private constructor(model: Model, material: Material, lifetime: number, bounds: ParticleBounds) {
        this.#model = model
        this.#material = material
        this.#lifetime = lifetime
        this.bounds = bounds
    }


    // CREATE //

    /**
     * Bake `count` particles emitted at a point.
     *
     * @param fill - Describes one particle, as for the emitters of a {@link ParticleSystem}.
     * @throws {@link Error} When `count` is below one or above {@link MAX_BURST_PARTICLES}, or the particles
     * differ by something the burst shares.
     */
    public static create(
        gpu: Gpu, random: Random, x: number, y: number, count: number, fill: Fill,
        options: BurstOptions = {},
    ): ParticleBurst {
        if(!Number.isInteger(count) || count < 1 || count > MAX_BURST_PARTICLES){
            throw new Error(`A burst holds from 1 to ${MAX_BURST_PARTICLES} particles, not ${count}.`)
        }
        const white = options.white ?? gpu.white
        const vertices = new Float32Array(count * 4 * RAW_VERTEX_SIZE)
        const indices = new Uint16Array(count * 6)
        const data = new Float32Array(count * 16)
        const spec = new ParticleSpec()
        let shared: ParticleSpec|null = null
        let lifetime = 0
        const bounds: ParticleBounds = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }

        for(let i = 0; i < count; i++){

            // PARTICLE //
            spec.reset()
            spec.x = x
            spec.y = y
            fill(spec, random, x, y)
            if(shared === null) shared = copyOf(spec)
            else if(!isShared(shared, spec)) throw new Error(DIFFERS)
            const life = Math.max(spec.life, 1e-6)
            lifetime = Math.max(lifetime, life)

            // BOUNDS //
            const source = spec.sprite ?? white
            const aspect = spec.sprite === null ? 1 : spec.sprite.height / spec.sprite.width
            const reach = reachOf(spec.vx, spec.vy, spec.ax, spec.ay, life)
                + Math.max(spec.sizeStart, spec.sizeEnd) / 2 * Math.hypot(1, aspect)
            bounds.left = Math.min(bounds.left, spec.x - reach)
            bounds.top = Math.min(bounds.top, spec.y - reach)
            bounds.right = Math.max(bounds.right, spec.x + reach)
            bounds.bottom = Math.max(bounds.bottom, spec.y + reach)

            // TEXTURE //
            const isWhite = spec.sprite === null
            const u0 = isWhite ? source.x + (source.width >> 1) : source.x
            const v0 = isWhite ? source.y + (source.height >> 1) : source.y
            const u1 = isWhite ? u0 : source.x + source.width
            const v1 = isWhite ? v0 : source.y + source.height

            // VERTICES //
            for(let corner = 0; corner < 4; corner++){
                const v = (i * 4 + corner) * RAW_VERTEX_SIZE
                vertices[v] = spec.x
                vertices[v + 1] = spec.y
                vertices[v + 3] = corner === 0 || corner === 3 ? u0 : u1
                vertices[v + 4] = corner < 2 ? v0 : v1
                vertices[v + 5] = spec.colorStart.r
                vertices[v + 6] = spec.colorStart.g
                vertices[v + 7] = spec.colorStart.b
                vertices[v + 8] = spec.colorStart.a
                const d = (i * 4 + corner) * 4
                data[d] = spec.vx
                data[d + 1] = spec.vy
                data[d + 2] = life
                data[d + 3] = corner
            }
            indices.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6)
        }

        // MODEL //
        const first = shared as ParticleSpec
        const end = first.colorEnd
        const material = new Material(burstShaderOf(gpu), {
            uAge: 0,
            uGravity: [first.ax, first.ay],
            uDrag: first.drag,
            uSize: [first.sizeStart, first.sizeEnd],
            uColorEnd: [end.r, end.g, end.b, end.a],
            uTurn: [first.rotation, first.spin, first.faceMotion ? 1 : 0],
            uAspect: first.sprite === null ? 1 : first.sprite.height / first.sprite.width,
        })
        const model = Model.create(gpu, {
            primitive: Primitive.TRIANGLES,
            vertices,
            indices,
            data,
            texture: (first.sprite ?? white).texture,
            material,
            blend: options.blend ?? "alpha",
        })
        return new ParticleBurst(model, material, lifetime, bounds)
    }


    // STATE //

    /** Has every particle reached the end of its life? Then the burst can be disposed. */
    public get isDone(): boolean {
        return this.age >= this.#lifetime
    }

    /** Was it freed? */
    public get disposed(): boolean {
        return this.#disposed
    }


    // UPDATE //

    /** Let time go by. Does nothing once done. */
    public update(dt: number): void {
        if(this.isDone) return
        this.age += Math.max(dt, 0)
    }


    // DRAW //

    /**
     * Draw the burst in one call.
     *
     * @param painter - Where to draw. Its tint and its transform apply.
     * @param offsetX - Added to every position, in pixels.
     * @param offsetY - Added to every position, in pixels.
     */
    public draw(painter: Painter, offsetX = 0, offsetY = 0): void {
        if(this.#disposed || this.isDone) return
        this.#material.set("uAge", this.age)
        painter.push()
        painter.translate(offsetX, offsetY)
        painter.model(this.#model)
        painter.pop()
    }

    /** Free the buffers. Disposing twice does nothing. */
    public dispose(): void {
        if(this.#disposed) return
        this.#model.dispose()
        this.#disposed = true
    }
}


// SHARED FIELDS //

const DIFFERS = "The particles of a burst share their force, drag, sizes, end color, sprite and turn,"
    + " and only differ by position, speed, life and start color."

/** A copy of the fields a burst shares, taken from a spec. */
function copyOf(spec: ParticleSpec): ParticleSpec {
    const copy = new ParticleSpec()
    copy.ax = spec.ax
    copy.ay = spec.ay
    copy.drag = spec.drag
    copy.sizeStart = spec.sizeStart
    copy.sizeEnd = spec.sizeEnd
    copy.colorEnd.copyFrom(spec.colorEnd)
    copy.sprite = spec.sprite
    copy.faceMotion = spec.faceMotion
    copy.rotation = spec.rotation
    copy.spin = spec.spin
    return copy
}

/** Does a spec have the shared fields of the first one? */
function isShared(first: ParticleSpec, spec: ParticleSpec): boolean {
    return first.ax === spec.ax && first.ay === spec.ay && first.drag === spec.drag
        && first.sizeStart === spec.sizeStart && first.sizeEnd === spec.sizeEnd
        && first.colorEnd.equals(spec.colorEnd) && first.sprite === spec.sprite
        && first.faceMotion === spec.faceMotion && first.rotation === spec.rotation
        && first.spin === spec.spin
}
