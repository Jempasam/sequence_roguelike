import type { Card } from "../card/Card"
import type { BodyPart } from "../card/CardType"

import type { Analysis, UnorderedAnatomy } from "./Anatomy"
import { effectsOf } from "./effects"
import type { EffectsTrace } from "./effects"
import { identityOf, MUST_MERGE, mergeableRuns, readableRuns } from "./identity"
import {
    AIM_PROFILE, BITE_PROFILE, fitOf, GUARD_PROFILE, MAIN_PROFILE, profileOf, RUN_PROFILE, SUPPORT_PROFILE,
} from "./Profile"
import type { Profile } from "./Profile"
import type { Range, Sizes } from "./Sizes"
import type { ChainTrace, IdentityTrace, PickStep, Traces } from "./Trace"
import { arranged, bestSet, completion, ranked, without } from "./UnorderedParts"

/** The profiles of the cards that are for neither the run nor the bite. */
const SUPPORTING: readonly Profile[] = [SUPPORT_PROFILE, GUARD_PROFILE, AIM_PROFILE]

/** The analysis of a source whose cards are not in order: it picks cards, and puts them in order. */
export class UnorderedAnalysis implements Analysis {


    constructor(public readonly anatomy: UnorderedAnatomy){}


    public run(sizes: Sizes): Card[] {
        return [...this.#runTrace(sizes).chosen]
    }

    public bite(sizes: Sizes): Card[] {
        return [...this.#biteTrace(sizes, this.#runTrace(sizes)).chosen]
    }

    public main(sizes: Sizes): Card[] {
        return [...this.#mainTrace(sizes).chosen]
    }

    public identity(sizes: Sizes): IdentityTrace {
        const chain = arranged(this.anatomy.parts)
        const notes = ["les suites de ses cartes mises dans un ordre qui se lit en entier"]
        return identityOf(readableRuns(chain, sizes.identity), sizes.identity, chain, notes, true)
    }

    public melange(sizes: Sizes): IdentityTrace {
        const chain = arranged(this.anatomy.parts)
        const notes = ["les suites de 2 cartes ou plus, de ses cartes mises dans un ordre, qui se mélangent"]
        const runs = mergeableRuns([chain], sizes.identity)
        return identityOf(runs, sizes.identity, chain, notes, true, MUST_MERGE)
    }

    public effects(sizes: Sizes): EffectsTrace {
        return effectsOf(this.identity(sizes).chosen, this.anatomy.parts)
    }

    public traces(sizes: Sizes): Traces {
        const run = this.#runTrace(sizes)
        return { run, bite: this.#biteTrace(sizes, run), main: this.#mainTrace(sizes) }
    }

    public support(sizes: Sizes): Card[] {
        const apart = without(this.anatomy.parts, [...this.run(sizes), ...this.bite(sizes)])
        return ranked(apart, SUPPORT_PROFILE).filter(card => SUPPORTING.includes(profileOf(card)))
    }

    public rest(...taken: readonly (readonly Card[])[]): Card[] {
        return without(this.anatomy.parts, taken.flat())
    }

    public roles(): BodyPart[] {
        const aims = this.anatomy.parts.filter(card => profileOf(card) === AIM_PROFILE)
        return [...bestSet(aims, AIM_PROFILE, 1), "run", "bite"]
    }


    /** How the run was found: the cards that fit the run profile the most, read whole. */
    #runTrace(sizes: Sizes): ChainTrace {
        return this.#traced(this.anatomy.parts, RUN_PROFILE, sizes.run)
    }

    /** How the bite was found: searched apart from the run, else among all the cards. */
    #biteTrace(sizes: Sizes, run: ChainTrace): ChainTrace {
        const apart = this.#traced(without(this.anatomy.parts, run.chosen), BITE_PROFILE, sizes.bite)
        if(apart.chosen.length > 0) return apart
        const whole = this.#traced(this.anatomy.parts, BITE_PROFILE, sizes.bite)
        return { ...whole, fallbacks: ["cherchée aussi parmi les cartes de la course", ...whole.fallbacks] }
    }

    /** How the main chain was found: the cards that fit the main profile the most, read whole. */
    #mainTrace(sizes: Sizes): ChainTrace {
        return this.#traced(this.anatomy.parts, MAIN_PROFILE, sizes.main)
    }

    /**
     * The cards that fit a profile the most, those that fit it at all, each with the cards it needs to read
     * whole, one chain after the other, as long as the range allows. When no card reads within the range, the
     * shortest chain that reads is given instead: a range is what is wished for, not what cards always do.
     */
    #traced(parts: readonly Card[], profile: Profile, size: Range): ChainTrace {
        let kept: Card[] = []
        const steps: PickStep[] = []
        for(const card of ranked(parts, profile)){
            const fit = fitOf(card, profile)
            if(kept.length >= size.max || fit <= 0){
                const reason = kept.length >= size.max ? "taille atteinte : on s'arrête" : "ne colle plus : on s'arrête"
                steps.push({ card, fit, row: null, kept: false, reason })
                break
            }
            if(kept.includes(card)){
                steps.push({ card, fit, row: null, kept: false, reason: "déjà prise avec une autre carte" })
                continue
            }
            const row = completion(card, without(parts, kept))
            if(!row){
                steps.push({ card, fit, row: null, kept: false, reason: "ne se lit pas avec les cartes qui restent" })
            }
            else if(kept.length + row.length > size.max){
                steps.push({ card, fit, row, kept: false, reason: "trop longue pour la taille" })
            }
            else {
                kept = [...kept, ...row]
                steps.push({ card, fit, row, kept: true, reason: "prise avec ce qu'il lui faut" })
            }
        }
        const base = { profile, size, searched: parts, windows: [] }
        if(kept.length > 0) return { ...base, steps, chosen: kept, fallbacks: [] }
        return { ...base, steps, chosen: this.#shortest(parts, profile), fallbacks: ["plus courte chaîne lisible"] }
    }

    /** The shortest chain of the cards that reads whole, the best fit of the profile first on a tie. */
    #shortest(parts: readonly Card[], profile: Profile): Card[] {
        let best: Card[] = []
        for(const card of ranked(parts, profile)){
            const row = completion(card, parts)
            if(row && (best.length === 0 || row.length < best.length)) best = row
        }
        return best
    }
}
