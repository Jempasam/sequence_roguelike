/**
 * Where a place lies across the width of the map, from 0 on the left to 1 on the right, once the places are
 * spread over all of it: the outermost ones at its edges, the others in proportion.
 *
 * @param across - Where the place lies across its row, as the journey says.
 * @param lowest - The smallest `across` of any place of the journey.
 * @param highest - The largest `across` of any place of the journey.
 */
export function spreadAcross(across: number, lowest: number, highest: number): number {
    if(highest <= lowest) return 0.5
    return (across - lowest) / (highest - lowest)
}
