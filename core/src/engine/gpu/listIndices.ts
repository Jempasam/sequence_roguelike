import { Primitive } from "./Primitive"

/**
 * The indices drawing the same shapes as a run of a strip, a fan or a loop, as independent pieces in
 * `primitive.list`, so the run can be put end to end with others.
 *
 * Every other triangle of a `TRIANGLE_STRIP` is flipped, or the winding would alternate and culling would
 * break. A `LINE_LOOP` gains the segment closing it.
 *
 * @param primitive - The primitive the indices are read with, one that is not independent.
 * @param indices - The run, a count of indices that `primitive` fits.
 * @throws {@link Error} When the primitive is already independent, or does not fit the indices.
 */
export function listIndices(primitive: Primitive, indices: ArrayLike<number>): Uint16Array {
    if(primitive.isIndependent) throw new Error("listIndices only converts strips, fans and loops.")
    if(!primitive.fits(indices.length)){
        throw new Error(`${indices.length} indices leave vertices over for this primitive.`)
    }
    const count = primitive.countOf(indices.length)
    const closing = primitive === Primitive.LINE_LOOP ? 2 : 0
    const out = new Uint16Array(count * primitive.list.verticesOfFirst + closing)
    let o = 0
    for(let i = 0; i < count; i++){
        switch(primitive){
            case Primitive.LINE_STRIP:
            case Primitive.LINE_LOOP:
                out[o++] = indices[i]
                out[o++] = indices[i + 1]
                break
            case Primitive.TRIANGLE_STRIP: {
                const flipped = i % 2 === 1
                out[o++] = indices[flipped ? i + 1 : i]
                out[o++] = indices[flipped ? i : i + 1]
                out[o++] = indices[i + 2]
                break
            }
            case Primitive.TRIANGLE_FAN:
                out[o++] = indices[0]
                out[o++] = indices[i + 1]
                out[o++] = indices[i + 2]
                break
            default:
                throw new Error(`Primitive ${primitive.glId} has no conversion to a list.`)
        }
    }
    if(primitive === Primitive.LINE_LOOP && count > 0){
        out[o++] = indices[indices.length - 1]
        out[o++] = indices[0]
    }
    return out.subarray(0, o)
}
