import type { Card } from "../card/Card"
import { readsWhole } from "../card/CardChain"
import type { BodyPart } from "../card/CardType"

import type { Analysis, OrderedAnatomy } from "./Anatomy"
import { effectsOf } from "./effects"
import type { EffectsTrace } from "./effects"
import { identityOf, MUST_MERGE, mergeableRuns, readableRuns } from "./identity"
import { keptRun, marked, occurrences, remaining, segments, windows, without } from "./OrderedChains"
import type { Span } from "./OrderedChains"
import {
    AIM_PROFILE, BITE_PROFILE, GUARD_PROFILE, MAIN_PROFILE, RUN_PROFILE, SUPPORT_PROFILE,
} from "./Profile"
import type { Profile } from "./Profile"
import { roundChains } from "./roundChains"
import { range } from "./Sizes"
import type { Range, Sizes } from "./Sizes"
import { given } from "./Trace"
import type { ChainTrace, IdentityTrace, Traces } from "./Trace"

/** The profiles of the cards that are for neither the run nor the bite. */
const SUPPORTING: readonly Profile[] = [SUPPORT_PROFILE, GUARD_PROFILE, AIM_PROFILE]

/** The analysis of a source whose cards are in order: it reads runs of its chain, in the order it finds. */
export class OrderedAnalysis implements Analysis {


    constructor(public readonly anatomy: OrderedAnatomy){}


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
        const { chain, roundSize } = this.anatomy
        if(roundSize){
            const notes = ["les rounds que l'unité joue, lus comme le bot les lit"]
            return identityOf(roundChains(chain, roundSize), sizes.identity, chain, notes, false)
        }
        const notes = ["les suites de sa chaîne qui se lisent en entier"]
        return identityOf(readableRuns(chain, sizes.identity), sizes.identity, chain, notes, true)
    }

    public melange(sizes: Sizes): IdentityTrace {
        const { chain, roundSize } = this.anatomy
        const chains = roundSize ? roundChains(chain, roundSize) : [chain]
        const notes = ["les suites de 2 cartes ou plus, dans les chaînes que l'unité joue, qui se mélangent"]
        const runs = mergeableRuns(chains, sizes.identity)
        return identityOf(runs, sizes.identity, chain, notes, true, MUST_MERGE)
    }

    public effects(sizes: Sizes): EffectsTrace {
        return effectsOf(this.identity(sizes).chosen, this.anatomy.chain)
    }

    public traces(sizes: Sizes): Traces {
        const run = this.#runTrace(sizes)
        return { run, bite: this.#biteTrace(sizes, run), main: this.#mainTrace(sizes) }
    }

    public support(sizes: Sizes): Card[] {
        const apart = remaining(this.anatomy.chain, this.run(sizes), this.bite(sizes))
        const supporting = segments(apart).filter(({ profile }) => SUPPORTING.includes(profile))
        const kept = new Set(supporting.flatMap(({ cards }) => cards))
        return apart.filter(card => kept.has(card))
    }

    public rest(...taken: readonly (readonly Card[])[]): Card[] {
        return remaining(this.anatomy.chain, ...taken)
    }

    public roles(sizes: Sizes): BodyPart[] {
        const run = this.run(sizes)
        const bite = this.bite(sizes)
        const body = this.anatomy.body
            ? [...this.anatomy.body]
            : this.#placed(run, bite, new Set(this.support(sizes)))
        const before: BodyPart[] = body.includes("run") ? [] : ["run"]
        const after: BodyPart[] = body.includes("bite") ? [] : ["bite"]
        return [...before, ...body, ...after]
    }


    /** What the source tells itself, as long as the sizes allow, none when it tells nothing. */
    #told(cards: readonly Card[]|null, size: Range): Card[]|null {
        return cards && cards.length > 0 ? cards.slice(0, size.max) : null
    }

    /** How the run was found: what the source tells of it, else the best run of its chain. */
    #runTrace(sizes: Sizes): ChainTrace {
        const chain = this.anatomy.chain
        const told = this.#told(this.anatomy.run, sizes.run)
        if(told) return given(RUN_PROFILE, sizes.run, chain, told)
        return this.#trace(chain, RUN_PROFILE, sizes.run)
    }

    /** How the bite was found: told, else searched apart from the run, else in the whole chain. */
    #biteTrace(sizes: Sizes, run: ChainTrace): ChainTrace {
        const chain = this.anatomy.chain
        const told = this.#told(this.anatomy.bite, sizes.bite)
        if(told) return given(BITE_PROFILE, sizes.bite, chain, told)
        const apart = this.#trace(without(chain, run.chosen), BITE_PROFILE, sizes.bite)
        if(apart.chosen.length > 0) return apart
        const whole = this.#trace(chain, BITE_PROFILE, sizes.bite)
        return { ...whole, fallbacks: ["cherchée aussi parmi les cartes de la course", ...whole.fallbacks] }
    }

    /** How the main chain was found: the best run of the chain for the main profile. */
    #mainTrace(sizes: Sizes): ChainTrace {
        return this.#trace(this.anatomy.chain, MAIN_PROFILE, sizes.main)
    }

    /**
     * The run of the chain that is the most for a profile, of a length in `size`, else the longest it allows,
     * else the first card that reads by itself.
     */
    #trace(chain: readonly Card[], profile: Profile, size: Range): ChainTrace {
        const tried = windows(chain, profile, size)
        const found = keptRun(chain, tried)
        const base = { profile, size, searched: chain, steps: [] }
        if(found.length > 0) return { ...base, windows: tried, chosen: found, fallbacks: [] }
        const wider = windows(chain, profile, range(1, size.max))
        const shorter = keptRun(chain, wider)
        if(shorter.length > 0) return { ...base, windows: wider, chosen: shorter, fallbacks: ["plage élargie"] }
        const alone = chain.find(card => readsWhole([card]))
        return {
            ...base, windows: wider, chosen: alone ? [alone] : [], fallbacks: ["première carte jouable seule"],
        }
    }

    /**
     * The chain with the places of the run and of the bite named, every time the chain plays one of them, and
     * of the other cards only those that support: the rest of a long deck is not what a body plays.
     */
    #placed(run: readonly Card[], bite: readonly Card[], supporting: ReadonlySet<Card>): BodyPart[] {
        const chain = this.anatomy.chain
        const spans: Span<"run"|"bite">[] = []
        for(const at of occurrences(chain, run)) spans.push({ marker: "run", at, length: run.length })
        for(const at of occurrences(chain, bite)){
            const apart = spans.every(span => at >= span.at + span.length || at + bite.length <= span.at)
            if(apart) spans.push({ marker: "bite", at, length: bite.length })
        }
        return marked(chain, spans).filter(part => typeof part === "string" || supporting.has(part))
    }
}
