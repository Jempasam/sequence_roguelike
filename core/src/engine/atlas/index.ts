/**
 * @packageDocumentation
 * Images gathered into pages of texture. An {@link Atlas} places images and reservations at any time,
 * writes them in its pages and gives their sprites, so sprites of one page draw in one batch. A
 * {@link RenderAtlas} does the same on pages that can be drawn into, for animated tiles. A {@link Packer}
 * computes where entries go, without the GPU, and only from the sequence of operations, so two atlases
 * given the same sequence stay parallel. Both atlases share their behavior through {@link PagedAtlas}.
 */

export * from "./Atlas"
export * from "./Packer"
export * from "./PagedAtlas"
export * from "./RenderAtlas"
