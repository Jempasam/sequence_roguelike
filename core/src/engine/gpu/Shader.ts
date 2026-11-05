import type { Gpu } from "./Gpu"
import type { Material } from "./Material"

/**
 * What a shader reads in `aData`, the free attribute of a vertex:
 * - `"none"`: nothing, 20 bytes per vertex. The standard shader, so most draws.
 * - `"bytes"`: 4 normalized bytes, from 0 to 1, 24 bytes per vertex. Effects by sprite: a flash, a palette
 *   swap, a dissolve.
 * - `"floats"`: 4 floats, 36 bytes per vertex, for the rare effect needing precision or values beyond 0 to 1.
 *
 * A value by sprite in `aData` keeps a thousand goblins flashing at their own pace in a single call, where
 * a uniform would break the batch at each sprite.
 */
export type DataLayout = "none"|"bytes"|"floats"

/** The GLSL types a uniform of a shader may have. */
export type UniformType = "float"|"vec2"|"vec3"|"vec4"|"mat4"|"sampler2D"

/** A uniform a shader declares in its source, beyond the standard ones. */
export interface UniformInfo {
    readonly name: string
    readonly type: UniformType
    readonly location: WebGLUniformLocation

    /** Where its value starts among the floats of a material, unused by a sampler. */
    readonly offset: number

    /** The texture unit of a sampler, from 1 since unit 0 is the texture of the draw, unused otherwise. */
    readonly unit: number
}

/** The source of a shader. */
export interface ShaderSource {
    /** The fragment source, defining `vec4 shade(vec2 uv, vec4 data)` and declaring its uniforms. */
    readonly fragment: string

    /**
     * A whole vertex shader, with its `main`, producing the varyings of the standard one, `vUV`, `vColor`
     * and `vData`, and `gl_PointSize` from `uPointSize`. None for the standard one, which most effects keep.
     */
    readonly vertex?: string

    /** What the shader reads in `aData`. */
    readonly layout?: DataLayout
}

/** The color of the texel, the base color of the standard shader. */
export const STANDARD_SHADE = "vec4 shade(vec2 uv, vec4 data){ return texture2D(uTexture, uv); }"

/** The uniforms every shader gets, in the order of the contract. */
const STANDARD_UNIFORMS = [
    "uModel", "uViewProjection", "uTargetSize", "uTexture", "uTextureSize", "uColorMode", "uTint",
    "uColorize", "uLight", "uPointSize", "uCutout",
] as const

/** A uniform every shader gets. */
export type StandardUniform = typeof STANDARD_UNIFORMS[number]

/** The attributes of the vertex format, by the location each is bound to. */
export const ATTRIBUTES = ["aPosition", "aUV", "aColor", "aData"] as const

/** The number of floats in a value of each type, 0 for a sampler, which holds a texture. */
const FLOATS: Readonly<Record<UniformType, number>> = {
    float: 1, vec2: 2, vec3: 3, vec4: 4, mat4: 16, sampler2D: 0,
}

/**
 * Shared uniforms take the same precision in both stages, or the program does not link: the highest one
 * the fragment stage has.
 */
const PRECISION = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#define SHARED highp
#else
precision mediump float;
#define SHARED mediump
#endif
`

const VERTEX_PRELUDE = `${PRECISION}
attribute vec3 aPosition;
attribute vec2 aUV;
attribute vec4 aColor;
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform SHARED vec2 uTargetSize;
uniform SHARED vec2 uTextureSize;
uniform float uPointSize;
varying vec2 vUV;
varying vec4 vColor;
varying vec4 vData;
`

/** The attribute `aData` of each layout: a constant 0 when the shader reads none. */
const DATA_ATTRIBUTE: Readonly<Record<DataLayout, string>> = {
    none: "const vec4 aData = vec4(0.0);\n",
    bytes: "attribute vec4 aData;\n",
    floats: "attribute vec4 aData;\n",
}

const STANDARD_VERTEX = `
void main(){
    gl_Position = uViewProjection * (uModel * vec4(aPosition, 1.0));
    vUV = aUV / uTextureSize;
    vColor = aColor;
    vData = aData;
    gl_PointSize = uPointSize;
}
`

const FRAGMENT_PRELUDE = `${PRECISION}
uniform sampler2D uTexture;
uniform SHARED vec2 uTextureSize;
uniform SHARED vec2 uTargetSize;
uniform float uColorMode;
uniform vec4 uTint;
uniform vec4 uColorize;
uniform vec3 uLight;
uniform float uCutout;
varying vec2 vUV;
varying vec4 vColor;
varying vec4 vData;
`

/**
 * The steps every shader shares after `shade`, in premultiplied alpha, which stays right since the
 * luminance and the saturation are linear: the color mode, the tint, the colorization, the light, then the
 * cutout. `uColorMode` is 0 to modulate, 1 to colorize, 2 to take the hue of the vertices.
 *
 * The hue mode keeps the luminance `L` and the saturation `S` of the texel, the gap between its highest and
 * lowest channels, and takes only the hue of the vertex color: that color stretched so its lowest channel
 * is 0 and its highest 1, `h`. The result is `S * h` raised by the grey that brings its luminance to `L`,
 * then kept in its range, which only there moves the luminance away from `L`. A grey vertex color has no
 * hue: the texel becomes the grey of its luminance.
 */
const FRAGMENT_MAIN = `
float engineLuminance(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 engineHue(vec3 c, float alpha, vec3 vertex){
    float saturation = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
    float lowest = min(vertex.r, min(vertex.g, vertex.b));
    float range = max(vertex.r, max(vertex.g, vertex.b)) - lowest;
    vec3 hue = range > 0.0 ? (vertex - lowest) / range : vec3(0.0);
    vec3 colored = saturation * hue + (engineLuminance(c) - saturation * engineLuminance(hue));
    return clamp(colored, 0.0, alpha);
}

void main(){
    vec4 c = shade(vUV, vData);
    if(uColorMode > 1.5) c = vec4(engineHue(c.rgb, c.a, vColor.rgb) * vColor.a, c.a * vColor.a);
    else if(uColorMode > 0.5) c = vec4(engineLuminance(c.rgb) * vColor.rgb, c.a * vColor.a);
    else c *= vColor;
    c *= uTint;
    c.rgb = mix(c.rgb, engineLuminance(c.rgb) * uColorize.rgb, uColorize.a);
    c.rgb *= uLight;
    if(uCutout > 0.5 && c.a < 0.5) discard;
    gl_FragColor = c;
}
`

/**
 * A compiled program that follows the shader contract: the vertex format, the standard uniforms, and a
 * fragment stage that only provides `vec4 shade(vec2 uv, vec4 data)`.
 *
 * @remarks
 * The engine writes the `main` of the fragment stage and applies the color mode, the tint, the
 * colorization, the light and the cutout after `shade`, so a custom shader cannot skip them by accident,
 * and a step added later applies to every shader. `shade` gets normalized texture coordinates, and can
 * still read `uTexture` and `uTextureSize`.
 *
 * A shader declares its uniforms in its source, and nowhere else: the engine reads them back from the
 * compiled program. A uniform declared but unused is removed by the GLSL compiler, so it does not exist
 * for a `Material` either.
 *
 * The contract is a public API: changing it breaks every custom shader.
 */
export class Shader {


    /** What the shader reads in `aData`. */
    public readonly layout: DataLayout

    /** The uniforms the source declares, beyond the standard ones, by name. */
    public readonly uniforms: ReadonlyMap<string, UniformInfo>

    /** How many floats the values of its uniforms take, in a material. */
    public readonly floatCount: number

    /** How many textures the values of its uniforms take, in a material. */
    public readonly samplerCount: number

    /** The material whose values the program holds, so drawing with it again uploads nothing. */
    public uploaded: Material|null = null

    /** The revision of that material when its values were uploaded. */
    public uploadedRevision = -1

    /**
     * @throws {@link Error} When the source redeclares a standard uniform, does not compile or link, declares
     * a uniform of a type the engine does not handle, or uses more textures than the GPU binds at once.
     */
    constructor(
        /** The GPU the program lives on. */
        public readonly gpu: Gpu,

        source: ShaderSource,
    ){
        this.layout = source.layout ?? "none"
        checkNoStandardUniform(source.fragment)
        if(source.vertex !== undefined) checkNoStandardUniform(source.vertex)
        const gl = gpu.gl
        const vertex = VERTEX_PRELUDE + DATA_ATTRIBUTE[this.layout] + (source.vertex ?? STANDARD_VERTEX)
        const fragment = FRAGMENT_PRELUDE + source.fragment + FRAGMENT_MAIN
        const compiledVertex = compile(gl, gl.VERTEX_SHADER, vertex)
        this.#program = link(gl, compiledVertex, compile(gl, gl.FRAGMENT_SHADER, fragment))
        const standard = new Map<string, WebGLUniformLocation|null>()
        for(const name of STANDARD_UNIFORMS) standard.set(name, gl.getUniformLocation(this.#program, name))
        this.#standard = standard
        const { uniforms, floatCount, samplerCount } = readUniforms(gl, this.#program)
        if(samplerCount + 1 > gpu.limits.maxTextureUnits){
            throw new Error(`A shader uses ${samplerCount} textures besides uTexture, beyond the`
                + ` ${gpu.limits.maxTextureUnits} units of the GPU.`)
        }
        this.uniforms = uniforms
        this.floatCount = floatCount
        this.samplerCount = samplerCount
        gpu.state.program(this.#program)
        gl.uniform1i(this.standardLocation("uTexture"), 0)
        for(const uniform of uniforms.values()){
            if(uniform.type === "sampler2D") gl.uniform1i(uniform.location, uniform.unit)
        }
    }

    /**
     * A shader with the standard vertex stage, as most effects only change `shade`.
     *
     * @example
     * ```ts
     * const water = Shader.fragment(gpu, `
     *     uniform float uTime;
     *     vec4 shade(vec2 uv, vec4 data){ ... }
     * `)
     * ```
     */
    public static fragment(gpu: Gpu, source: string, layout: DataLayout = "none"): Shader {
        return new Shader(gpu, { fragment: source, layout })
    }


    /** Was it freed? */
    public get disposed(): boolean { return this.#disposed }

    /** The WebGL program. */
    public get program(): WebGLProgram {
        if(this.#disposed) throw new Error("A disposed shader was drawn with.")
        return this.#program
    }

    /** Where a standard uniform is, none when the program does not use it. */
    public standardLocation(name: StandardUniform): WebGLUniformLocation|null {
        return this.#standard.get(name) ?? null
    }

    /**
     * Free the program. Drawing with one of its materials afterwards throws. Disposing twice does nothing.
     */
    public dispose(): void {
        if(this.#disposed) return
        this.gpu.batch.flush()
        this.gpu.gl.deleteProgram(this.#program)
        this.#disposed = true
    }


    readonly #program: WebGLProgram
    readonly #standard: ReadonlyMap<string, WebGLUniformLocation|null>
    #disposed = false
}


//// Building ////

/** Refuse a source declaring a uniform the engine already declares, with a clearer error than GLSL's. */
function checkNoStandardUniform(source: string): void {
    for(const match of source.matchAll(/\buniform\s+(?:\w+\s+)?\w+\s+(\w+)/g)){
        const name = match[1]
        if((STANDARD_UNIFORMS as readonly string[]).includes(name)){
            throw new Error(`A shader declares ${name}, which the engine declares itself. Rename it.`)
        }
    }
}

function compile(gl: WebGLRenderingContext, stage: number, source: string): WebGLShader {
    const shader = gl.createShader(stage)
    if(!shader) throw new Error("WebGL could not create a shader, likely because the context was lost.")
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
        const log = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader)
        const name = stage === gl.VERTEX_SHADER ? "vertex" : "fragment"
        throw new Error(`The ${name} shader does not compile. Its lines are numbered after the engine's`
            + ` prelude:\n${log}`)
    }
    return shader
}

function link(gl: WebGLRenderingContext, vertex: WebGLShader, fragment: WebGLShader): WebGLProgram {
    const program = gl.createProgram()
    if(!program) throw new Error("WebGL could not create a program, likely because the context was lost.")
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    // Bound before linking, so every program and every vertex array agree, and aPosition, always enabled,
    // takes location 0, which desktop GL requires to be an array.
    ATTRIBUTES.forEach((name, location) => gl.bindAttribLocation(program, location, name))
    gl.linkProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
        const log = gl.getProgramInfoLog(program)
        gl.deleteProgram(program)
        throw new Error(`The shader does not link:\n${log}`)
    }
    return program
}

/** The uniforms a program has beyond the standard ones, and the room their values take. */
function readUniforms(gl: WebGLRenderingContext, program: WebGLProgram): {
    uniforms: ReadonlyMap<string, UniformInfo>, floatCount: number, samplerCount: number
} {
    const uniforms = new Map<string, UniformInfo>()
    let floatCount = 0
    let samplerCount = 0
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number
    for(let i = 0; i < count; i++){
        const active = gl.getActiveUniform(program, i)
        if(!active || (STANDARD_UNIFORMS as readonly string[]).includes(active.name)) continue
        const type = uniformTypeOf(gl, active.type)
        if(!type || active.size !== 1){
            throw new Error(`The shader uniform ${active.name} is neither a float, a vec2 to vec4, a mat4 nor a`
                + " sampler2D, the only types a material holds.")
        }
        const location = gl.getUniformLocation(program, active.name)
        if(!location) throw new Error(`WebGL lists the uniform ${active.name}, but gives no location for it.`)
        const isSampler = type === "sampler2D"
        const unit = isSampler ? samplerCount + 1 : 0
        uniforms.set(active.name, { name: active.name, type, location, offset: floatCount, unit })
        floatCount += FLOATS[type]
        if(isSampler) samplerCount++
    }
    return { uniforms, floatCount, samplerCount }
}

function uniformTypeOf(gl: WebGLRenderingContext, glType: number): UniformType|null {
    switch(glType){
        case gl.FLOAT: return "float"
        case gl.FLOAT_VEC2: return "vec2"
        case gl.FLOAT_VEC3: return "vec3"
        case gl.FLOAT_VEC4: return "vec4"
        case gl.FLOAT_MAT4: return "mat4"
        case gl.SAMPLER_2D: return "sampler2D"
        default: return null
    }
}

/** The number of floats in a value of a uniform type. */
export function floatsOf(type: UniformType): number {
    return FLOATS[type]
}
