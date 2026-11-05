import { Color, Mat4, Vec3 } from "../math"

import { floatsOf } from "./Shader"
import type { Shader, UniformInfo } from "./Shader"
import { Texture } from "./Texture"

/**
 * The value of a uniform: a number for a `float`, a `Vec3` or 3 numbers for a `vec3`, a `Color` (its
 * components as they are, not premultiplied) or 4 numbers for a `vec4`, 2 numbers for a `vec2`, a `Mat4`
 * for a `mat4`, and a `Texture` for a `sampler2D`.
 */
export type UniformValue = number|ArrayLike<number>|Vec3|Color|Mat4|Texture

/**
 * A set of values for the uniforms of a shader. Several materials share a shader: two lakes of different
 * colors, a single program.
 *
 * @remarks
 * The values are copied, not kept by reference: a working `Color` or `Mat4` changed afterwards does not
 * change the material. The textures are referenced, so a replay shows their current content, as for a
 * `Model`.
 *
 * A material holds no GL resource, so it has no `dispose`. Drawing with one whose shader was disposed
 * throws.
 *
 * A material reading `gl_FragCoord`, the screen coordinates, does not draw the same through a texture and
 * through a `Model` replayed directly: nothing can detect it.
 */
export class Material {


    /**
     * @param values - The values of some uniforms. Every other one starts at zero, and every texture at none,
     * which throws when drawn.
     * @throws {@link Error} As {@link Material.set} does, for each value.
     */
    constructor(
        /** The shader the values are for. */
        public readonly shader: Shader,

        values: Readonly<Record<string, UniformValue>> = {},
    ){
        this.#floats = new Float32Array(shader.floatCount)
        this.#textures = new Array<Texture|null>(shader.samplerCount).fill(null)
        this.#views = new Map()
        for(const uniform of shader.uniforms.values()){
            const end = uniform.offset + floatsOf(uniform.type)
            this.#views.set(uniform.name, this.#floats.subarray(uniform.offset, end))
        }
        for(const [name, value] of Object.entries(values)) this.#write(name, value)
    }


    /** A number that changes whenever a value does. */
    public get revision(): number { return this.#revision }

    /** The textures of its samplers, by unit minus one. */
    public get textures(): readonly (Texture|null)[] { return this.#textures }

    /**
     * Give a uniform a value. Checked rather than typed: the name has to be an active uniform of the shader,
     * and the value has to match its GLSL type, so a typo does not pass in silence. Allocates nothing.
     *
     * The pending batch is sent first when it draws with this material, or the draws submitted before the
     * change would leave with the new value.
     *
     * @throws {@link Error} When the shader has no such active uniform, or the value does not fit its type.
     */
    public set(name: string, value: UniformValue): void {
        this.shader.gpu.batch.flushIfUses(this)
        this.#write(name, value)
    }

    /** Does a draw with it read the texture? */
    public reads(texture: Texture): boolean {
        for(const own of this.#textures) if(own === texture) return true
        return false
    }

    /** Upload its values into its program, unless they are there already, and bind its textures. */
    public apply(): void {
        const shader = this.shader
        const { gl, state } = shader.gpu
        for(const uniform of shader.uniforms.values()){
            if(uniform.type !== "sampler2D") continue
            const texture = this.#textures[uniform.unit - 1]
            if(!texture) throw new Error(`A material is drawn without a texture for ${uniform.name}.`)
            state.texture(uniform.unit, texture.handle)
        }
        if(shader.uploaded === this && shader.uploadedRevision === this.#revision) return
        for(const uniform of shader.uniforms.values()) upload(gl, uniform, this.#views.get(uniform.name))
        shader.uploaded = this
        shader.uploadedRevision = this.#revision
    }


    readonly #floats: Float32Array
    readonly #textures: (Texture|null)[]

    /** The floats of each uniform, among the ones of the material, so setting one allocates nothing. */
    readonly #views: Map<string, Float32Array>

    #revision = 0

    #write(name: string, value: UniformValue): void {
        const uniform = this.shader.uniforms.get(name)
        if(!uniform){
            const known = [...this.shader.uniforms.keys()].join(", ") || "none"
            throw new Error(`The shader has no active uniform ${name}. It has: ${known}. A uniform declared but`
                + " unused is removed by the GLSL compiler.")
        }
        const view = this.#views.get(name)
        if(!view) throw new Error(`The material has no room for ${name}.`)
        if(!writeValue(uniform, value, view, this.#textures)){
            throw new Error(`The shader uniform ${name} is a ${uniform.type}, which ${describe(value)} is not.`)
        }
        this.#revision++
    }
}

/** Write a value into the room of its uniform. Does the value fit its type? */
function writeValue(
    uniform: UniformInfo, value: UniformValue, view: Float32Array, textures: (Texture|null)[],
): boolean {
    switch(uniform.type){
        case "float":
            if(typeof value !== "number") return false
            view[0] = value
            return true
        case "vec3":
            if(value instanceof Vec3){
                view[0] = value.x
                view[1] = value.y
                view[2] = value.z
                return true
            }
            return writeNumbers(value, view)
        case "vec4":
            if(value instanceof Color){
                view[0] = value.r
                view[1] = value.g
                view[2] = value.b
                view[3] = value.a
                return true
            }
            return writeNumbers(value, view)
        case "vec2":
            return writeNumbers(value, view)
        case "mat4":
            if(!(value instanceof Mat4)) return false
            view.set(value.elements)
            return true
        case "sampler2D":
            if(!(value instanceof Texture)) return false
            textures[uniform.unit - 1] = value
            return true
        default:
            return false
    }
}

/** Write a list of numbers of exactly the size of the room. Does it have that size? */
function writeNumbers(value: UniformValue, view: Float32Array): boolean {
    const isList = typeof value === "object" && "length" in value && !(value instanceof Mat4)
    if(!isList || value.length !== view.length) return false
    for(let i = 0; i < view.length; i++) view[i] = value[i]
    return true
}

function upload(gl: WebGLRenderingContext, uniform: UniformInfo, view: Float32Array|undefined): void {
    if(!view) return
    switch(uniform.type){
        case "float":
            gl.uniform1f(uniform.location, view[0])
            break
        case "vec2":
            gl.uniform2fv(uniform.location, view)
            break
        case "vec3":
            gl.uniform3fv(uniform.location, view)
            break
        case "vec4":
            gl.uniform4fv(uniform.location, view)
            break
        case "mat4":
            gl.uniformMatrix4fv(uniform.location, false, view)
            break
        case "sampler2D":
            // Bound to its unit once and for all by the shader.
            break
        default:
            throw new Error(`Unknown uniform type ${String(uniform.type)}.`)
    }
}

function describe(value: UniformValue): string {
    if(typeof value === "number") return "a number"
    if(value instanceof Texture) return "a texture"
    if("length" in value) return `a list of ${value.length} numbers`
    return `a ${value.constructor.name}`
}
