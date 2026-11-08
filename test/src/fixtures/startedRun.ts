import { LANCER_KIT, Run, SWORDSMAN_KIT } from "@game/core/mecard"

/** What a run takes after its seed. */
type AfterSeed = ConstructorParameters<typeof Run> extends [number, ...infer Rest] ? Rest : never

/**
 * A run as it was before the start was a tavern: a party of a lancer and a swordsman, standing before the
 * first fights of the floor, the map drawn again without the way in.
 */
export function startedRun(seed: number, ...rest: AfterSeed): Run {
    const run = new Run(seed, ...rest)
    run.hire(LANCER_KIT)
    run.hire(SWORDSMAN_KIT)
    run.travel.redrawMap()
    return run
}
