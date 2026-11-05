/**
 * @packageDocumentation
 * The lowest layer of rendering, and the only part of the game calling `gl.*`. A {@link Painter} draws,
 * through a stack of states, on a surface: the screen ({@link ScreenSurface}), a texture
 * ({@link TextureSurface} on a {@link RenderTexture}), or a recording, flattened into one {@link Model} by a
 * {@link ModelSurface} or composed into a {@link MultiModel} by a {@link MultiModelSurface}. {@link Gpu}
 * holds the context and the batch every surface shares, {@link Camera} projects a target, and
 * {@link Shader} with {@link Material} draw custom effects through the shader contract.
 *
 * It does not cut, sort or cull anything: that belongs to the game. It only guarantees that a `Model`
 * draws in one call, and that exceeding 65 535 vertices throws a clear error.
 */

export * from "./Camera"
export type { BlendMode, BlendState, ColorMode, DepthTest } from "./DrawKey"
export { MAX_VERTICES, RAW_VERTEX_SIZE } from "./Geometry"
export * from "./Gpu"
export * from "./listIndices"
export * from "./Material"
export * from "./Model"
export * from "./ModelSurface"
export * from "./MultiModel"
export * from "./MultiModelSurface"
export * from "./Painter"
export * from "./Primitive"
export * from "./RenderTexture"
export * from "./ScreenSurface"
export { Shader, STANDARD_SHADE } from "./Shader"
export type { DataLayout, ShaderSource, UniformInfo, UniformType } from "./Shader"
export * from "./Sprite"
export type * from "./Surface"
export * from "./TargetSurface"
export * from "./Tessellation"
export * from "./Texture"
export * from "./TextureSurface"
