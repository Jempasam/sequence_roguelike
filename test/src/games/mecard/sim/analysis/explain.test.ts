import { describe, expect, test } from "vitest"
import { analysisOf } from "@game/core-src/games/mecard/sim/analysis/analysisOf"
import { explain, readCard } from "@game/core-src/games/mecard/sim/analysis/explain"
import {
    BEAST_KIND,
    convert,
    KINDS,
    MODULE_KIND,
    MONSTER_KIND,
    PET_KIND,
} from "@game/core-src/games/mecard/sim/analysis/Kinds"
import { MAIN_PROFILE, PROFILES } from "@game/core-src/games/mecard/sim/analysis/Profile"
import { ELEMENT_TARGET, FUSION_TARGET, TARGETS } from "@game/core-src/games/mecard/sim/analysis/Targets"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { AIM } from "@game/core-src/games/mecard/sim/card/subs/movement/Aim"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { ALL_CARDS } from "@game/core-src/games/mecard/sim/catalog/cards"
import { ALL_MONSTERS, GOBLIN } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { WOLF } from "@game/core-src/games/mecard/sim/catalog/pets"
import type { Kind } from "@game/core-src/games/mecard/sim/analysis/Kinds"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"
import { bestRun, windows } from "@game/core/mecard/ordered-chains"
import { featuresOf } from "@game/core-src/games/mecard/sim/analysis/CardFeatures"

// --- Fixture builders ---

const SOURCES = KINDS.flatMap(source => source.all().map(value => ({ source, value })))

function names(cards: readonly Card[]): string[] {
    return cards.map(card => card.name)
}

// --- Tests ---

describe("explain", () => {
    for(const target of KINDS){
        test(`every source → the chains explained for a ${target.id} are the ones the analysis finds`, () => {
            const failures: string[] = []
            for(const { source, value } of SOURCES){
                const explained = explain(source, value, target as Kind<unknown>)
                const analysis = analysisOf(source.anatomy(value))
                const label = `${source.id}:${source.nameOf(value)} -> ${target.id}`
                const sizes = target.defaults
                const found = {
                    run: analysis.run(sizes), bite: analysis.bite(sizes), main: analysis.main(sizes),
                }
                for(const name of ["run", "bite", "main"] as const){
                    if(names(explained.traces[name].chosen).join() !== names(found[name]).join()){
                        failures.push(`${label}: ${name} differs`)
                    }
                }
            }
            expect(failures).toEqual([])
        })
    }

    test("a beast → the run and the bite it was built with are the ones explained", () => {
        const explained = explain(PET_KIND, WOLF, BEAST_KIND)
        const { beast } = explained.made as { beast: { run: Card[], bite: Card[] } }
        expect(names(beast.run)).toEqual(names(explained.traces.run.chosen))
        expect(names(beast.bite)).toEqual(names(explained.traces.bite.chosen))
    })

    test("a module → the cards it was built with are the main chain explained", () => {
        const explained = explain(MONSTER_KIND, GOBLIN, MODULE_KIND)
        const { cards } = explained.made as { cards: Card[] }
        expect(names(cards)).toEqual(names(explained.traces.main.chosen))
    })

    test("a target that finds nothing → explained all the same, with why nothing was built", () => {
        const slime = ALL_MONSTERS.find(each => each.name === "Slime")!
        const explained = explain(MONSTER_KIND, slime, ELEMENT_TARGET)
        expect(explained.made).toBeNull()
        expect(explained.none).toContain("aucun élément possible")
        expect(explained.cards.length).toBeGreaterThan(0)
        expect(explained.steps.some(step => step.startsWith("Effets positifs"))).toBe(true)
    })

    test("an element → the neutral effects told with the others", () => {
        const mind = ALL_MONSTERS.find(each => each.name === "Contrôleur mental")!
        const explained = explain(MONSTER_KIND, mind, ELEMENT_TARGET)
        expect(explained.effects.neutral.length).toBeGreaterThan(0)
        expect(explained.steps.some(step => step.startsWith("Effets neutres"))).toBe(true)
    })

    test("a target that builds something → no reason given, the identity of the unit told", () => {
        const explained = explain(MONSTER_KIND, GOBLIN, FUSION_TARGET)
        expect(explained.none).toBeNull()
        expect(explained.made).not.toBeNull()
        expect(names(explained.identity.chosen).length).toBeGreaterThan(0)
        expect(explained.steps.some(step => step.startsWith("Chaîne d'identité"))).toBe(true)
    })

    test("every source and every target → explained without error, the same each time", { timeout: 120_000 }, () => {
        const failures: string[] = []
        for(const { source, value } of SOURCES){
            for(const target of TARGETS){
                const first = explain(source, value, target)
                const second = explain(source, value, target)
                const label = `${source.id}:${source.nameOf(value)} -> ${target.id}`
                if(first.none !== second.none) failures.push(`${label}: not deterministic`)
                if((first.made === null) !== (first.none !== null)) failures.push(`${label}: made and none disagree`)
            }
        }
        expect(failures).toEqual([])
    })

    test("what is built → the same as the conversion gives", () => {
        const explained = explain(MONSTER_KIND, GOBLIN, MONSTER_KIND)
        const converted = convert(MONSTER_KIND, GOBLIN, MONSTER_KIND)
        expect(names((explained.made as { cards: Card[] }).cards)).toEqual(names(converted.cards))
    })

    test("a monster → its deck cut in rounds of its draw, each read as the chain reads it", () => {
        const explained = explain(MONSTER_KIND, GOBLIN, MONSTER_KIND)
        expect(explained.ordered).toBe(true)
        expect(explained.roundSize).toBe(GOBLIN.draw)
        expect(explained.rounds).toHaveLength(GOBLIN.cards.length / GOBLIN.draw)
        for(const round of explained.rounds){
            expect(round.roots.reduce((size, root) => size + root.size, 0)).toBe(round.cards.length)
            expect(round.active).toHaveLength(round.cards.length)
        }
    })

    test("a monster made → the rounds it will play are explained too", () => {
        const explained = explain(PET_KIND, WOLF, MONSTER_KIND)
        const made = explained.made as { cards: Card[], draw: number }
        expect(explained.madeRounds).toHaveLength(made.cards.length / made.draw)
    })

    test("a source with no order → no rounds, the cards picked one after the other instead", () => {
        const explained = explain(PET_KIND, WOLF, BEAST_KIND)
        expect(explained.ordered).toBe(false)
        expect(explained.rounds).toEqual([])
        expect(explained.traces.run.windows).toEqual([])
        expect(explained.traces.run.steps.length).toBeGreaterThan(0)
        expect(explained.traces.run.steps.some(step => step.kept)).toBe(true)
    })

    test("an ordered source → the runs tried, one of them kept", () => {
        const explained = explain(MONSTER_KIND, GOBLIN, BEAST_KIND)
        const { windows: tried } = explained.traces.run
        expect(tried.length).toBeGreaterThan(0)
        expect(tried.filter(each => each.status === "chosen")).toHaveLength(1)
        expect(tried.filter(each => each.status === "rejected").every(each => each.reason !== null)).toBe(true)
    })

    test("the steps in words → one for each stage, with the values of the conversion", () => {
        const explained = explain(MONSTER_KIND, GOBLIN, BEAST_KIND)
        expect(explained.steps.length).toBeGreaterThanOrEqual(9)
        expect(explained.steps.join(" ")).toContain(`rounds de ${GOBLIN.draw}`)
        expect(explained.steps.join(" ")).toContain(`course ${BEAST_KIND.defaults.run.min} à ${BEAST_KIND.defaults.run.max}`)
    })

    test("a source that is already a beast → its run is told by the source, not searched", () => {
        const [first] = BEAST_KIND.all()
        const explained = explain(BEAST_KIND, first, MODULE_KIND)
        expect(explained.traces.run.fallbacks).toEqual(["donnée par la source"])
        expect(explained.traces.run.windows).toEqual([])
    })
})

describe("profile.explain", () => {
    const sample = [STEP, THRUST, AIM, ...ALL_CARDS.slice(0, 60)]

    test("every profile and every card → the terms add up to the score", () => {
        const failures: string[] = []
        for(const card of sample){
            const features = featuresOf(card)
            for(const profile of [...PROFILES, MAIN_PROFILE]){
                const sum = profile.explain(features).reduce((total, term) => total + term.amount, 0)
                if(Math.abs(sum - profile.score(features)) > 1e-9) failures.push(`${card.name}/${profile.id}`)
            }
        }
        expect(failures).toEqual([])
    })

    test("a step → its score for the run profile says it comes from the move measured", () => {
        const reading = readCard(STEP)
        const run = reading.profiles.find(each => each.profile.id === "run")!
        expect(run.contributions.some(term => term.label.includes("déplacement"))).toBe(true)
        expect(reading.winner.id).toBe("run")
        expect(reading.output).toBeTruthy()
    })

    test("a card read → what it takes and gives, its keywords and its measure told", () => {
        const reading = readCard(THRUST)
        expect(reading.input).toBeNull()
        expect(reading.measure?.damage).toBeGreaterThan(0)
        expect(reading.profiles).toHaveLength(PROFILES.length + 1)
        expect(reading.profiles[reading.profiles.length - 1].profile).toBe(MAIN_PROFILE)
    })
})

describe("windows", () => {
    const chain = [AIM, STEP, STEP, THRUST, THRUST]
    const size = { min: 1, max: 3 }
    const run = PROFILES[0]

    test("the runs tried → the one kept is the best run", () => {
        const tried = windows(chain, run, size)
        const kept = tried.find(each => each.status === "chosen")!
        expect(chain.slice(kept.at, kept.at + kept.length)).toEqual(bestRun(chain, run, size))
    })

    test("a run that starts with a card that does not fit → rejected, and told so", () => {
        const tried = windows(chain, run, size)
        const starting = tried.find(each => each.at === 0 && each.length === 2)!
        expect(starting.status).toBe("rejected")
        expect(starting.reason).toBe("début ne colle pas")
    })

    test("a run shorter than wished → rejected as out of size", () => {
        const tried = windows(chain, run, { min: 2, max: 3 })
        const single = tried.find(each => each.at === 1 && each.length === 1)!
        expect(single.reason).toBe("hors taille")
    })

    test("a run another beats → rejected, told that another fits better", () => {
        const tried = windows(chain, run, size)
        const beaten = tried.filter(each => each.status === "rejected" && each.reason === "une autre fenêtre colle mieux")
        expect(beaten.length).toBeGreaterThan(0)
    })
})
