import { Mat4 } from "../math"

import type { Camera } from "./Camera"
import { DrawEnvironment } from "./DrawEnvironment"
import { DrawKey } from "./DrawKey"
import { Geometry, MAX_VERTICES, strideOf } from "./Geometry"
import type { Gpu } from "./Gpu"
import type { Material } from "./Material"
import { createBuffer, createVertexArray } from "./Mesh"
import { Primitive } from "./Primitive"
import type { DataLayout } from "./Shader"
import { checkSources, viewProjectionOf } from "./TargetSurface"
import type { TargetSurface } from "./TargetSurface"
import type { Texture } from "./Texture"

/** The most indices one batch holds: three per vertex, as many as a fan of triangles takes. */
const MAX_INDICES = 3 * MAX_VERTICES

/** The tint of the batch, which writes its own into the vertices: opaque white. */
const NO_TINT = Float32Array.of(1, 1, 1, 1)

/** The transform of the batch, which applies the painter's on the CPU: the identity. */
const NO_TRANSFORM = new Mat4()

/**
 * The draws not yet sent to the GPU, shared by every surface of a `Gpu`.
 *
 * @remarks
 * It holds one run at a time: draws with the same target, camera, key and environment. Any change sends
 * the run first, so the batch never holds two keys, and drawing into texture A then drawing A into B sees
 * what was drawn into A. It also sends when full, and before a `Model` is drawn.
 */
export class Batch {


    constructor(gpu: Gpu){
        this.#gpu = gpu
        const gl = gpu.gl
        this.#vertexBuffer = createBuffer(gl)
        this.#indexBuffer = createBuffer(gl)
        this.#vertexArrays = {
            none: createVertexArray(gpu, "none", this.#vertexBuffer, this.#indexBuffer),
            bytes: createVertexArray(gpu, "bytes", this.#vertexBuffer, this.#indexBuffer),
            floats: createVertexArray(gpu, "floats", this.#vertexBuffer, this.#indexBuffer),
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, MAX_VERTICES * strideOf("floats"), gl.STREAM_DRAW)
        // Every vertex array shares the index buffer, so filling it through the last one bound fills it for
        // all.
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, MAX_INDICES * 2, gl.STREAM_DRAW)
        this.#key = new DrawKey(gpu.white.texture, gpu.standardMaterial, Primitive.TRIANGLES)
    }


    /** Is there nothing to send? */
    public get isEmpty(): boolean { return this.#geometry.indexCount === 0 }

    /**
     * Make room for a draw into a target, sending the run first when the draw does not belong to it or does
     * not fit in it.
     *
     * @throws {@link Error} When the draw alone is larger than a batch, or reads the texture of its target.
     */
    public reserve(
        target: TargetSurface, key: DrawKey, environment: DrawEnvironment, vertices: number, indices: number,
    ): Geometry {
        if(vertices > MAX_VERTICES || indices > MAX_INDICES){
            throw new Error(`A draw of ${vertices} vertices and ${indices} indices exceeds a batch, at most`
                + ` ${MAX_VERTICES} vertices and ${MAX_INDICES} indices.`)
        }
        const camera = target.camera
        const continuesRun = target === this.#target && camera === this.#camera
            && camera.version === this.#cameraVersion && environment === this.#environmentSource
            && environment.revision === this.#environmentRevision && key.equals(this.#key)
        if(!continuesRun) this.#start(target, key, environment)
        else if(!this.#geometry.fits(vertices, indices)) this.flush()
        this.#geometry.begin(vertices, indices)
        return this.#geometry
    }

    /** Send the run to the GPU. Sending an empty batch does nothing. */
    public flush(): void {
        const geometry = this.#geometry
        const target = this.#target
        if(geometry.indexCount === 0 || !target){
            geometry.clear()
            return
        }
        const gl = this.#gpu.gl
        const vertexArray = this.#vertexArrays[geometry.layout]
        this.#gpu.state.vertexArray(vertexArray)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, geometry.vertexBytes)
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, geometry.indices)
        this.#gpu.drawRun(target, this.#viewProjection, this.#key, this.#environment, vertexArray,
            this.#key.primitive.glId, geometry.indexCount, NO_TRANSFORM, NO_TINT)
        geometry.clear()
    }

    /** Send the run first when it reads the texture, which is about to change. */
    public flushIfReads(texture: Texture): void {
        if(!this.isEmpty && this.#key.reads(texture)) this.flush()
    }

    /** Send the run first when it draws with the material, whose values are about to change. */
    public flushIfUses(material: Material): void {
        if(!this.isEmpty && this.#key.material === material) this.flush()
    }

    /** Free the buffers. */
    public dispose(): void {
        const { gl, state } = this.#gpu
        state.vertexArray(null)
        for(const layout of ["none", "bytes", "floats"] as const){
            state.vertexArrays.deleteVertexArrayOES(this.#vertexArrays[layout])
        }
        gl.deleteBuffer(this.#vertexBuffer)
        gl.deleteBuffer(this.#indexBuffer)
    }


    readonly #gpu: Gpu
    readonly #geometry = new Geometry("none", MAX_VERTICES, MAX_INDICES, false)
    readonly #vertexBuffer: WebGLBuffer
    readonly #indexBuffer: WebGLBuffer
    readonly #vertexArrays: Readonly<Record<DataLayout, WebGLVertexArrayObjectOES>>

    //// The run ////

    #target: TargetSurface|null = null
    #camera: Camera|null = null
    #cameraVersion = -1

    /** The projection of the camera at the start of the run, in case it moves before the run is sent. */
    readonly #viewProjection = new Mat4()

    /** A copy of the key of the run. */
    readonly #key: DrawKey

    /** A copy of the environment of the run, in case its source changes before the run is sent. */
    readonly #environment = new DrawEnvironment()

    /** The environment the run was drawn under, and its revision then. */
    #environmentSource: DrawEnvironment|null = null
    #environmentRevision = -1

    /** Send the current run, and start another one. */
    #start(target: TargetSurface, key: DrawKey, environment: DrawEnvironment): void {
        this.flush()
        checkSources(target, key)
        this.#target = target
        this.#camera = target.camera
        this.#cameraVersion = target.camera.version
        viewProjectionOf(target, this.#viewProjection)
        this.#key.copyFrom(key)
        this.#environment.copyFrom(environment)
        this.#environmentSource = environment
        this.#environmentRevision = environment.revision
        this.#geometry.setLayout(key.material.shader.layout)
    }
}
