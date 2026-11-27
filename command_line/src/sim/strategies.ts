import { DeckAi } from "@game/core-src/games/mecard/sim/ai/Bot"
import {
    DEFAULT_CANDIDATES,
    DEPTH_AIS,
    depthAi,
    LATEST_SMART,
    SMART_VARIANTS,
} from "@game/core-src/games/mecard/sim/ai/catalog"
import { AHEAD_CHAINS, LookaheadAi } from "@game/core-src/games/mecard/sim/ai/LookaheadAi"
import { RandomAi } from "@game/core-src/games/mecard/sim/ai/RandomAi"
import { ShuffleAi } from "@game/core-src/games/mecard/sim/ai/ShuffleAi"
import type { DepthAi } from "@game/core-src/games/mecard/sim/ai/catalog"
import type { Variant } from "@game/core-src/games/mecard/sim/ai/LookaheadAi"
import type { UnitController } from "@game/core-src/games/mecard/sim/ai/UnitController"
import type { Rng } from "@game/core-src/games/mecard/sim/base/Rng"

import { UsageError } from "./errors"

/** How a unit plays its rounds: the AI that decides its chain from what the unit may know. */
export interface Strategy {
    /** How it is written in `--ai`, `deck`, `smart3:6-usables`. */
    readonly name: string

    /** Does it use the usables of its units, every round? */
    readonly usables: boolean

    /** Is it the AI of the game, which a bot unit plays on its own? */
    readonly deck: boolean

    /** The AI that decides for a unit, once per battle, drawing its random numbers from `rng`. */
    ai(rng: Rng): UnitController

    /**
     * Does it choose the usables of its units itself, in its plan? Otherwise, when {@link usables}, each
     * usable ready is used every round.
     */
    readonly choosesUsables?: boolean
}

/** What is told when a strategy could not think about a round. */
export const REFINE_FAILED = "IA : le combat n'a pas pu être copié (un processus est en cours), la chaîne du deck est jouée"

/** One AI the user may choose. */
export interface StrategyKind {
    readonly name: string
    readonly description: string

    /** Make it, from what follows its name after a colon, if anything. */
    create(argument: number|null, usables: boolean): Strategy
}

/** The deck AI: the hand read from left to right, as the monsters do. */
function deck(usables: boolean, name: string): Strategy {
    return { name, usables, deck: true, ai: () => new DeckAi() }
}

/** The hand shuffled, then read from left to right: any order, always a valid chain. */
function random(usables: boolean, name: string): Strategy {
    return { name, usables, deck: false, ai: rng => new RandomAi(rng) }
}

/** The first lookahead, which tries hands only. */
function shuffle(candidates: number, usables: boolean, name: string): Strategy {
    return { name, usables, deck: false, ai: rng => new ShuffleAi(rng, candidates, 1) }
}

/** The lookahead AIs, set apart by their variant, at depth 1. */
function lookahead(candidates: number, usables: boolean, name: string, variant: Variant): Strategy {
    return {
        name, usables, deck: false, choosesUsables: variant.heuristics && usables,
        ai: rng => new LookaheadAi(rng, candidates, usables, variant, 1),
    }
}

/** What a `smart9` or `smart10` changes of `smart8`, told in words. */
function setupText(setup: DepthAi): string {
    const told: string[] = []
    const combined = setup.combine === "safe" ? "garde le pire score" : setup.combine === "unsafe" ? "garde le meilleur score" : "fait la moyenne des scores"
    told.push(`prédit les autres unités à la depth ${setup.depths.join(", ")} et ${combined}, chaque unité décidée une seule fois par niveau`)
    if(setup.hiddenDecks) told.push("ne compte que sur les cartes en main (pioches et défausses vues comme des cartes cachées)")
    const positions = setup.variant?.positions
    if(positions) told.push(`compte la position face aux ennemis (${positions.exposed} cœur devant un ennemi, ${positions.aim} avec un ennemi devant soi)`)
    if(setup.variant?.aheadChains) told.push(`rejoue ses ${setup.variant.aheadChains} meilleures chaînes sur deux rounds`)
    if(setup.future) told.push(`joue le 2e round des essais avec ${setup.future} en depth 0`)
    return told.join(" ; ")
}

/** A `smart9` or `smart10`: `smart8` changed by the setup of its name. */
function depthKind(name: keyof typeof DEPTH_AIS): StrategyKind {
    const setup: DepthAi = DEPTH_AIS[name]
    return {
        name,
        description: `smart8 (${name}:K pour K), qui ${setupText(setup)}`,
        create: (argument, usables) => {
            const candidates = argument ?? DEFAULT_CANDIDATES
            const base = `${name}:${candidates}`
            return {
                name: usables ? base : `${base}-usables`, usables, deck: false, choosesUsables: usables,
                ai: rng => depthAi(setup, rng, candidates, usables),
            }
        },
    }
}

/** The alias of the latest `smartN`, the default AI: it is set to the last version at each new one. */
export const SMART = "smart"

/** The AI that {@link SMART} stands for. */
const LATEST = LATEST_SMART

/** The AIs, in the order `--ai` lists them. */
export const STRATEGIES: readonly StrategyKind[] = [
    {
        name: "deck",
        description: "l'IA du jeu : la main lue de gauche à droite, comme les monstres",
        create: (_, usables) => deck(usables, usables ? "deck" : "deck-usables"),
    },
    {
        name: "random",
        description: "la main mélangée, puis lue de gauche à droite : un ordre quelconque",
        create: (_, usables) => random(usables, usables ? "random" : "random-usables"),
    },
    {
        name: "smart1",
        description: `essaie ${DEFAULT_CANDIDATES} mains mélangées (smart1:K pour K) sur une copie du combat, sans jouer pas ni rotation de lui-même`,
        create: (argument, usables) => {
            const candidates = argument ?? DEFAULT_CANDIDATES
            const base = `smart1:${candidates}`
            return shuffle(candidates, usables, usables ? base : `${base}-usables`)
        },
    },
    {
        name: "smart2",
        description: `essaie ${DEFAULT_CANDIDATES} mains (smart2:K pour K), puis où avancer, puis où et vers où se tourner, sur une copie du combat, garde la chaîne qui laisse le plus de vie`,
        create: (argument, usables) => {
            const candidates = argument ?? DEFAULT_CANDIDATES
            const base = `smart2:${candidates}`
            return lookahead(candidates, usables, usables ? base : `${base}-usables`, SMART_VARIANTS.smart2)
        },
    },
    {
        name: "smart3",
        description: `smart2 (smart3:K pour K), dont le score compte aussi les cartes en main, les statuts gagnés et les processus lancés, et qui choisit ses usables`,
        create: (argument, usables) => {
            const candidates = argument ?? DEFAULT_CANDIDATES
            const base = `smart3:${candidates}`
            return lookahead(candidates, usables, usables ? base : `${base}-usables`, SMART_VARIANTS.smart3)
        },
    },
    {
        name: "smart4",
        description: `smart3 (smart4:K pour K), qui essaie aussi de jouer moins de cartes : retire des cartes de la chaîne tant que ça va mieux, jusqu'à ne rien jouer de la main`,
        create: (argument, usables) => {
            const candidates = argument ?? DEFAULT_CANDIDATES
            const base = `smart4:${candidates}`
            return lookahead(candidates, usables, usables ? base : `${base}-usables`, SMART_VARIANTS.smart4)
        },
    },
    {
        name: "smart5",
        description: `smart4 (smart5:K pour K), qui compte les statuts de toute unité selon leur durée au-delà d'un tour, sans bonus de processus`,
        create: (argument, usables) => {
            const candidates = argument ?? DEFAULT_CANDIDATES
            const base = `smart5:${candidates}`
            return lookahead(candidates, usables, usables ? base : `${base}-usables`, SMART_VARIANTS.smart5)
        },
    },
    {
        name: "smart6",
        description: `smart5 (smart6:K pour K), dont la main est cherchée pas à pas (échanges, déplacements, une carte de plus ou de moins) au lieu de l'élagage : à l'essai`,
        create: (argument, usables) => {
            const candidates = argument ?? DEFAULT_CANDIDATES
            const base = `smart6:${candidates}`
            return lookahead(candidates, usables, usables ? base : `${base}-usables`, SMART_VARIANTS.smart6)
        },
    },
    {
        name: "smart7",
        description: `smart6 (smart7:K pour K), qui compte un statut à partir de 3 rounds (au lieu de 2) et départage ses ${AHEAD_CHAINS} meilleures chaînes en jouant deux rounds sur la copie`,
        create: (argument, usables) => {
            const candidates = argument ?? DEFAULT_CANDIDATES
            const base = `smart7:${candidates}`
            return lookahead(candidates, usables, usables ? base : `${base}-usables`, SMART_VARIANTS.smart7)
        },
    },
    {
        name: "smart8",
        description: `smart7 (smart8:K pour K), qui écarte sans les jouer les chaînes dont les préparations ne se réécrivent pas entières (entrée manquante, carte grisée), vues par leurs seules réécritures`,
        create: (argument, usables) => {
            const candidates = argument ?? DEFAULT_CANDIDATES
            const base = `smart8:${candidates}`
            return lookahead(candidates, usables, usables ? base : `${base}-usables`, SMART_VARIANTS.smart8)
        },
    },
    {
        name: "smart8_path",
        description: "smart8 (smart8_path:K pour K), qui se tourne aussi vers le chemin contournant les obstacles, et départage ses chaînes par la longueur de ce chemin jusqu'à l'ennemi",
        create: (argument, usables) => {
            const candidates = argument ?? DEFAULT_CANDIDATES
            const base = `smart8_path:${candidates}`
            return lookahead(candidates, usables, usables ? base : `${base}-usables`, SMART_VARIANTS.smart8_path)
        },
    },
    ...(Object.keys(DEPTH_AIS) as (keyof typeof DEPTH_AIS)[]).map(depthKind),
    {
        name: SMART,
        description: `alias du dernier smartN, ${LATEST} aujourd'hui (smart:K pour K)`,
        create: (argument, usables) => STRATEGIES.find(kind => kind.name === LATEST)!.create(argument, usables),
    },
]

/** The AIs that take a number of chains to try. */
const COUNTED = new Set([
    "smart1", "smart2", "smart3", "smart4", "smart5", "smart6", "smart7", "smart8", "smart8_path",
    ...Object.keys(DEPTH_AIS), SMART,
])

/**
 * Read an AI: `deck`, `random`, `smart1`, `smart2`, `smart3`, `smart4`, `smart` (the latest `smartN`), or `smartN:K`, followed by `-usables` to leave the
 * usables unused.
 *
 * @param option - How an error names where the text came from.
 * @throws {@link UsageError} On an AI that does not exist or an argument that is no number from 2.
 */
export function parseStrategy(text: string, option: string): Strategy {
    const match = /^([a-z][a-z\d_]*)(?::(\d+))?(-usables)?$/.exec(text.trim())
    const kind = match ? STRATEGIES.find(candidate => candidate.name === match[1]) : undefined
    if(!match || !kind){
        const listed = STRATEGIES.map(each => `${each.name} (${each.description})`).join(" ; ")
        throw new UsageError(`${option} : IA invalide « ${text} ». IA disponibles : ${listed}. Suffixe -usables pour ne pas les utiliser.`)
    }
    if(match[2] !== undefined && !COUNTED.has(kind.name)){
        throw new UsageError(`${option} : « ${kind.name} » ne prend pas d'argument (seuls ${[...COUNTED].map(each => `${each}:K`).join(", ")} en prennent un).`)
    }
    if(match[2] !== undefined && Number(match[2]) < 2){
        throw new UsageError(`${option} : ${kind.name}:${match[2]} : au moins 2 chaînes à essayer.`)
    }
    return kind.create(match[2] === undefined ? null : Number(match[2]), match[3] === undefined)
}
