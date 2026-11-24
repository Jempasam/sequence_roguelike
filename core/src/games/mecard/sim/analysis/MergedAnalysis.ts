import type { Card } from "../card/Card"
import type { BodyPart } from "../card/CardType"
import { mergeable } from "../card/subs/composite/MergedCard"

import type { Analysis, Anatomy } from "./Anatomy"
import { effectsOf } from "./effects"
import type { EffectsTrace } from "./effects"
import type { Sizes } from "./Sizes"
import type { ChainTrace, IdentityTrace, Traces } from "./Trace"

/** The cards of lists, each once, in the order they are first met. */
function distinct(lists: readonly (readonly Card[])[]): Card[] {
    return [...new Set(lists.flat())]
}

/**
 * Several analyses made one: each source was analysed on its own, and this gives what an analysis gives, from
 * what every one of them found, in the order the sources were chosen. A target built from it needs no more
 * code for several sources than for one.
 */
export class MergedAnalysis implements Analysis {


    constructor(
        public readonly parts: readonly Analysis[],

        /** The sources made one: the name, the hearts, the look. */
        public readonly anatomy: Anatomy,
    ){}


    public run(sizes: Sizes): Card[] {
        return this.parts.flatMap(part => part.run(sizes))
    }

    public bite(sizes: Sizes): Card[] {
        return this.parts.flatMap(part => part.bite(sizes))
    }

    public main(sizes: Sizes): Card[] {
        return this.parts.flatMap(part => part.main(sizes))
    }

    public support(sizes: Sizes): Card[] {
        return distinct(this.parts.map(part => part.support(sizes)))
    }

    public rest(...taken: readonly (readonly Card[])[]): Card[] {
        const left = distinct(this.parts.map(part => part.rest()))
        const gone = new Set(taken.flat())
        return left.filter(card => !gone.has(card))
    }

    public roles(sizes: Sizes): BodyPart[] {
        return this.parts.flatMap(part => part.roles(sizes))
    }

    public traces(sizes: Sizes): Traces {
        const each = this.parts.map(part => part.traces(sizes))
        return {
            run: this.#joined(each.map(found => found.run)),
            bite: this.#joined(each.map(found => found.bite)),
            main: this.#joined(each.map(found => found.main)),
        }
    }

    /** The chains that stand for each source, one after the other. */
    public identity(sizes: Sizes): IdentityTrace {
        const each = this.parts.map(part => part.identity(sizes))
        const names = this.parts.map(part => part.anatomy.name)
        const notes = each.map((found, index) => {
            return found.chosen.length > 0
                ? `${names[index]} : ${found.chosen.map(card => card.name).join(", ")}`
                : `${names[index]} : aucune chaîne qui la représente`
        })
        return {
            size: sizes.identity,
            searched: distinct(each.map(found => found.searched)),
            candidates: each.flatMap(found => found.candidates),
            chosen: each.flatMap(found => found.chosen),
            notes,
        }
    }

    /**
     * The mix of the first source, then the mix of each source after it as long as all of them still merge
     * into one card: a source whose mix does not merge with the ones before is left out, and the notes say
     * so.
     */
    public melange(sizes: Sizes): IdentityTrace {
        const each = this.parts.map(part => part.melange(sizes))
        const chosen: Card[] = []
        const notes: string[] = []
        each.forEach((found, index) => {
            const name = this.parts[index].anatomy.name
            if(found.chosen.length === 0){
                notes.push(`${name} : aucun mélange possible`)
                return
            }
            const together = [...chosen, ...found.chosen]
            if(!mergeable(together)){
                notes.push(`${name} : écartée, son mélange ne se mélange pas avec les précédents`)
                return
            }
            chosen.push(...found.chosen)
            notes.push(`${name} : ${found.chosen.map(card => card.name).join(", ")}`)
        })
        return {
            size: sizes.identity,
            searched: distinct(each.map(found => found.searched)),
            candidates: each.flatMap(found => found.candidates),
            chosen,
            notes,
        }
    }

    public effects(sizes: Sizes): EffectsTrace {
        return effectsOf(this.identity(sizes).chosen, this.rest())
    }


    /** The traces of the sources as one: the chains one after the other. */
    #joined(traces: readonly ChainTrace[]): ChainTrace {
        const [first] = traces
        return {
            profile: first.profile,
            size: first.size,
            searched: distinct(traces.map(trace => trace.searched)),
            windows: traces.flatMap(trace => trace.windows),
            steps: traces.flatMap(trace => trace.steps),
            chosen: traces.flatMap(trace => trace.chosen),
            fallbacks: [...new Set(traces.flatMap(trace => trace.fallbacks))],
        }
    }
}
