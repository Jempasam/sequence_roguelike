import { COLOR_OFFSET, DATA_OFFSET, POSITION_OFFSET, strideOf, UV_OFFSET } from "./Geometry"
import type { Gpu } from "./Gpu"
import type { DataLayout } from "./Shader"

/**
 * The GPU buffers of a `Model`: its vertices, its indices and the vertex array reading them in the layout
 * of its material.
 */
export class Mesh {


    /** The vertex array to bind to draw it. */
    public readonly vertexArray: WebGLVertexArrayObjectOES

    constructor(
        public readonly gpu: Gpu,
        layout: DataLayout,
        vertices: Uint8Array,
        indices: Uint16Array,
    ){
        const gl = gpu.gl
        this.#vertexBuffer = createBuffer(gl)
        this.#indexBuffer = createBuffer(gl)
        this.vertexArray = createVertexArray(gpu, layout, this.#vertexBuffer, this.#indexBuffer)
        gl.bindBuffer(gl.ARRAY_BUFFER, this.#vertexBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)
    }


    /** Free the buffers. */
    public dispose(): void {
        const gl = this.gpu.gl
        this.gpu.state.vertexArray(null)
        this.gpu.state.vertexArrays.deleteVertexArrayOES(this.vertexArray)
        gl.deleteBuffer(this.#vertexBuffer)
        gl.deleteBuffer(this.#indexBuffer)
    }


    readonly #vertexBuffer: WebGLBuffer
    readonly #indexBuffer: WebGLBuffer
}

export function createBuffer(gl: WebGLRenderingContext): WebGLBuffer {
    const buffer = gl.createBuffer()
    if(!buffer) throw new Error("WebGL could not create a buffer, likely because the context was lost.")
    return buffer
}

/**
 * Create a vertex array reading a vertex buffer in the vertex format of the engine, with its index
 * buffer. It is left bound, so the index buffer can be filled right away: that binding belongs to the
 * vertex array.
 */
export function createVertexArray(
    gpu: Gpu, layout: DataLayout, vertexBuffer: WebGLBuffer, indexBuffer: WebGLBuffer,
): WebGLVertexArrayObjectOES {
    const { gl, state } = gpu
    const vertexArray = state.vertexArrays.createVertexArrayOES()
    if(!vertexArray) throw new Error("WebGL could not create a vertex array, likely because the context was lost.")
    state.vertexArray(vertexArray)
    const stride = strideOf(layout)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, POSITION_OFFSET)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.UNSIGNED_SHORT, false, stride, UV_OFFSET)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, stride, COLOR_OFFSET)
    if(layout === "bytes"){
        gl.enableVertexAttribArray(3)
        gl.vertexAttribPointer(3, 4, gl.UNSIGNED_BYTE, true, stride, DATA_OFFSET)
    } else if(layout === "floats"){
        gl.enableVertexAttribArray(3)
        gl.vertexAttribPointer(3, 4, gl.FLOAT, false, stride, DATA_OFFSET)
    }
    return vertexArray
}
