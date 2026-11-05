import type { GfxPort } from "@game/core"

/** A call core made on the fake context. */
export interface GlCall {
    readonly name: string
    readonly args: readonly unknown[]
}

/** A fake context and what was done with it. */
export interface FakeGl {
    readonly gl: WebGLRenderingContext
    readonly calls: GlCall[]

    /** The calls of one name, in order. */
    callsOf(name: string): GlCall[]

    /** The name of a constant, from its value. */
    nameOf(value: unknown): string|undefined
}

/** How the fake GPU differs from a default one. */
export interface FakeGlOptions {
    /** Does it offer `WEBGL_depth_texture`? Yes by default. */
    readonly depthTexture?: boolean
}

/** The GLSL types the fake reads in a source, by the name of their WebGL constant. */
const GL_TYPES: Readonly<Record<string, string>> = {
    float: "FLOAT", vec2: "FLOAT_VEC2", vec3: "FLOAT_VEC3", vec4: "FLOAT_VEC4", mat4: "FLOAT_MAT4",
    sampler2D: "SAMPLER_2D", int: "INT", mat3: "FLOAT_MAT3",
}

const PARAMETERS: Readonly<Record<string, unknown>> = {
    MAX_TEXTURE_SIZE: 4096,
    MAX_TEXTURE_IMAGE_UNITS: 8,
    ALIASED_LINE_WIDTH_RANGE: Float32Array.of(1, 1),
    ALIASED_POINT_SIZE_RANGE: Float32Array.of(1, 64),
}

/**
 * A WebGL context that draws nothing and records every call, so the engine can be tested without a GPU.
 * Each constant gets a distinct value, and the uniforms of a program are read from its sources: a uniform
 * is active when its name appears beyond its declaration, as a GLSL compiler would keep it.
 */
export function fakeGl(options: FakeGlOptions = {}): FakeGl {
    const calls: GlCall[] = []
    const constants = new Map<string, number>()
    const names = new Map<number, string>()
    const constantOf = (name: string): number => {
        let value = constants.get(name)
        if(value === undefined){
            value = 0x10000 + constants.size
            constants.set(name, value)
            names.set(value, name)
        }
        return value
    }
    const sources = new Map<object, string>()
    const attached = new Map<object, object[]>()
    const uniformsOf = (program: object): { name: string, type: string }[] => {
        const source = (attached.get(program) ?? []).map(shader => sources.get(shader) ?? "").join("\n")
        const found = new Map<string, string>()
        const declarations = /\buniform\s+(?:(?:lowp|mediump|highp|SHARED)\s+)?(\w+)\s+(\w+)\s*;/g
        for(const match of source.matchAll(declarations)){
            const [, type, name] = match
            const uses = source.match(new RegExp(`\\b${name}\\b`, "g"))?.length ?? 0
            if(uses > 1) found.set(name, type)
        }
        return [...found].map(([name, type]) => ({ name, type }))
    }
    let nextId = 0
    const object = (kind: string) => ({ kind, id: nextId++ })
    const vertexArrays = {
        createVertexArrayOES: () => object("vertexArray"),
        bindVertexArrayOES: (vertexArray: unknown) => calls.push({ name: "bindVertexArrayOES", args: [vertexArray] }),
        deleteVertexArrayOES: (vertexArray: unknown) => {
            calls.push({ name: "deleteVertexArrayOES", args: [vertexArray] })
        },
    }
    const methods: Record<string, (...args: never[]) => unknown> = {
        getExtension: (name: string) => {
            if(name === "OES_vertex_array_object") return vertexArrays
            if(name === "WEBGL_depth_texture") return options.depthTexture === false ? null : {}
            return null
        },
        getParameter: (parameter: number) => PARAMETERS[names.get(parameter) ?? ""],
        createShader: () => object("shader"),
        createProgram: () => object("program"),
        createTexture: () => object("texture"),
        createBuffer: () => object("buffer"),
        createFramebuffer: () => object("framebuffer"),
        createRenderbuffer: () => object("renderbuffer"),
        shaderSource: (shader: object, source: string) => sources.set(shader, source),
        attachShader: (program: object, shader: object) => {
            attached.set(program, [...attached.get(program) ?? [], shader])
        },
        getShaderParameter: () => true,
        getProgramParameter: (program: object, parameter: number) => {
            return names.get(parameter) === "ACTIVE_UNIFORMS" ? uniformsOf(program).length : true
        },
        getActiveUniform: (program: object, index: number) => {
            const uniform = uniformsOf(program)[index]
            return { name: uniform.name, size: 1, type: constantOf(GL_TYPES[uniform.type] ?? "UNKNOWN") }
        },
        getUniformLocation: (program: object, name: string) => {
            return uniformsOf(program).some(uniform => uniform.name === name) ? { uniform: name } : null
        },
        checkFramebufferStatus: () => constantOf("FRAMEBUFFER_COMPLETE"),
    }
    const gl = new Proxy({}, {
        get(_, property){
            if(typeof property !== "string") return undefined
            if(/^[A-Z][A-Z0-9_]*$/.test(property)) return constantOf(property)
            return (...args: unknown[]) => {
                calls.push({ name: property, args })
                return methods[property]?.(...args as never[])
            }
        },
    }) as WebGLRenderingContext
    return {
        gl,
        calls,
        callsOf: name => calls.filter(call => call.name === name),
        nameOf: value => typeof value === "number" ? names.get(value) : undefined,
    }
}

/** A platform surface of a size over a fake context, whose resize the test triggers. */
export function fakeGfx(gl: WebGLRenderingContext, width = 320, height = 180): GfxPort & {
    resize(width: number, height: number): void
    readonly presented: number
} {
    const callbacks: ((width: number, height: number) => void)[] = []
    let presented = 0
    const size = { width, height }
    return {
        gl,
        get width(){ return size.width },
        get height(){ return size.height },
        pixelRatio: 1,
        onResize: callback => callbacks.push(callback),
        present: () => presented++,
        get presented(){ return presented },
        resize(newWidth, newHeight){
            size.width = newWidth
            size.height = newHeight
            for(const callback of callbacks) callback(newWidth, newHeight)
        },
    }
}

/** The floats of the vertices last sent by the batch, a vertex of `stride` bytes after the other. */
export function lastVertices(
    fake: FakeGl, stride = 20,
): { position: number[], uv: number[], color: number[] }[] {
    const uploads = fake.callsOf("bufferSubData").filter(call => fake.nameOf(call.args[0]) === "ARRAY_BUFFER")
    const bytes = uploads[uploads.length - 1]?.args[2] as Uint8Array|undefined
    if(!bytes) throw new Error("No vertices were sent.")
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const vertices = []
    for(let offset = 0; offset < bytes.byteLength; offset += stride){
        vertices.push({
            position: [0, 4, 8].map(k => view.getFloat32(offset + k, true)),
            uv: [12, 14].map(k => view.getUint16(offset + k, true)),
            color: [16, 17, 18, 19].map(k => view.getUint8(offset + k)),
        })
    }
    return vertices
}
