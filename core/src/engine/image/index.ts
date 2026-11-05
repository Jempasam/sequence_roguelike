/**
 * @packageDocumentation
 * Images as pixels: {@link PixelData} is what a texture or an atlas is made from, and {@link decodePng}
 * turns a PNG file into it, in pure JS, so both platforms give exactly the same pixels. {@link decodeOra}
 * reads an OpenRaster file into its named layers, and {@link shrinkPixels} makes a large painting small.
 */

export * from "./decodeOra"
export * from "./decodePng"
export * from "./OraError"
export * from "./PixelData"
export * from "./PngError"
export * from "./shrinkPixels"
