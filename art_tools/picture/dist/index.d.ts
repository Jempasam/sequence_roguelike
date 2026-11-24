/**
 * The headless surface of the library: nothing here touches the DOM, so it runs under Node as
 * well as in a browser. The canvas-bound helpers live in `rendering_modes.js`, the editor element
 * in `editor/picture_editor.js`, and the node-only tools (PNG encoding, reading a value off a
 * command line) in `tools/` — all three outside this barrel on purpose.
 */
export { Matrix } from "./Matrix.js";
export { Picture, lerpMaterial } from "./Picture.js";
export type { PictureMaterial } from "./Picture.js";
export { BakedPicture, BakedPictureUtils } from "./BakedPicture.js";
export { default as effects } from "./effects.js";
export { default as pipelines, DEFAULT_LIGHT } from "./pipelines.js";
export { LoadError, at, objectLoader, recordLoader, registryLoader, listLoader } from "./loader/kit.js";
export * as params from "./loader/params.js";
export { FILTERS, FILTER_LIST, FILTER_LOADERS } from "./loader/filters.js";
export { RENDER, STEPS, STEP_LOADERS, PRESETS } from "./loader/render.js";
export { DOCUMENT, DOCUMENT_4, PALETTE, PALETTE_4, PIXELS, MATERIAL, DEFAULT_DEPTH, MAX_MATERIALS, EDITOR_MATERIALS, documentLoader, paletteLoader, materialChar, renderDocument, toDocument, withOverrides, } from "./loader/document.js";
