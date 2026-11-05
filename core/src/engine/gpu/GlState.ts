import type { DrawEnvironment } from "./DrawEnvironment"
import type { BlendState, DepthTest } from "./DrawKey"

/**
 * The state of the WebGL context, as last set, so each change costs a GL call only when the value really
 * changes. Every binding of the engine goes through it: a call made around it would leave it believing a
 * stale value.
 */
export class GlState {


    constructor(
        public readonly gl: WebGLRenderingContext,

        public readonly vertexArrays: OES_vertex_array_object,
    ){
        gl.enable(gl.DEPTH_TEST)
        gl.depthFunc(gl.LEQUAL)
        gl.disable(gl.BLEND)
        gl.disable(gl.SCISSOR_TEST)
    }


    /** Draw into a framebuffer, the screen when none, over its whole size. */
    public framebuffer(framebuffer: WebGLFramebuffer|null, width: number, height: number): void {
        const gl = this.gl
        if(framebuffer !== this.#framebuffer){
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
            this.#framebuffer = framebuffer
        }
        if(width !== this.#viewportWidth || height !== this.#viewportHeight){
            gl.viewport(0, 0, width, height)
            this.#viewportWidth = width
            this.#viewportHeight = height
        }
    }

    /** Note that a framebuffer was deleted, which WebGL unbinds by itself. */
    public forgetFramebuffer(framebuffer: WebGLFramebuffer): void {
        if(this.#framebuffer === framebuffer) this.#framebuffer = null
    }

    public program(program: WebGLProgram): void {
        if(program === this.#program) return
        this.gl.useProgram(program)
        this.#program = program
    }

    public vertexArray(vertexArray: WebGLVertexArrayObjectOES|null): void {
        if(vertexArray === this.#vertexArray) return
        this.vertexArrays.bindVertexArrayOES(vertexArray)
        this.#vertexArray = vertexArray
    }

    /** Bind a texture to a unit, which stays the active one afterwards. */
    public texture(unit: number, texture: WebGLTexture|null): void {
        const gl = this.gl
        if(unit !== this.#activeUnit){
            gl.activeTexture(gl.TEXTURE0 + unit)
            this.#activeUnit = unit
        }
        if(this.#textures[unit] === texture) return
        gl.bindTexture(gl.TEXTURE_2D, texture)
        this.#textures[unit] = texture
    }

    /** Set the blend function, premultiplied as every color of the engine. */
    public blend(state: BlendState): void {
        if(state === this.#blend) return
        const gl = this.gl
        switch(state){
            case "cutout":
            case "copy":
                gl.disable(gl.BLEND)
                break
            case "over":
                gl.enable(gl.BLEND)
                gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
                break
            case "multiply":
                gl.enable(gl.BLEND)
                gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA)
                break
            default:
                throw new Error(`Unknown blend state ${String(state)}.`)
        }
        this.#blend = state
    }

    /** Set the depth test, named so that a greater `z` is nearer. */
    public depthTest(test: DepthTest): void {
        if(test === this.#depthTest) return
        const gl = this.gl
        switch(test){
            case "nearer-or-equal":
                gl.depthFunc(gl.LEQUAL)
                break
            case "farther":
                gl.depthFunc(gl.GREATER)
                break
            case "always":
                gl.depthFunc(gl.ALWAYS)
                break
            default:
                throw new Error(`Unknown depth test ${String(test)}.`)
        }
        this.#depthTest = test
    }

    public depthWrite(write: boolean): void {
        if(write === this.#depthWrite) return
        this.gl.depthMask(write)
        this.#depthWrite = write
    }

    /** Clip to the rectangle of an environment, or to nothing when it has none. */
    public scissor(environment: DrawEnvironment|null): void {
        const gl = this.gl
        const hasClip = environment?.hasClip === true
        if(hasClip !== this.#scissorEnabled){
            if(hasClip) gl.enable(gl.SCISSOR_TEST)
            else gl.disable(gl.SCISSOR_TEST)
            this.#scissorEnabled = hasClip
        }
        if(!environment || !hasClip) return
        const { clipX: x, clipY: y, clipWidth: width, clipHeight: height } = environment
        if(x === this.#scissorX && y === this.#scissorY && width === this.#scissorWidth
            && height === this.#scissorHeight) return
        gl.scissor(x, y, width, height)
        this.#scissorX = x
        this.#scissorY = y
        this.#scissorWidth = width
        this.#scissorHeight = height
    }

    public lineWidth(width: number): void {
        if(width === this.#lineWidth) return
        this.gl.lineWidth(width)
        this.#lineWidth = width
    }


    #framebuffer: WebGLFramebuffer|null = null
    #viewportWidth = -1
    #viewportHeight = -1
    #program: WebGLProgram|null = null
    #vertexArray: WebGLVertexArrayObjectOES|null = null
    #activeUnit = -1
    readonly #textures: (WebGLTexture|null)[] = []
    #blend: BlendState = "cutout"
    #depthTest: DepthTest = "nearer-or-equal"
    #depthWrite = true
    #scissorEnabled = false
    #scissorX = -1
    #scissorY = -1
    #scissorWidth = -1
    #scissorHeight = -1
    #lineWidth = 1
}
