import type { ErrorSink } from "../base/Observable"
import { loadedVisual, savedVisual } from "../base/Visual"
import type { VisualData } from "../base/Visual"
import type { Controller, StatBases } from "../battle/Unit"
import type { Card } from "../card/Card"
import { Heart } from "../heart/Heart"
import { hero } from "../run/Hero"
import type { Hero } from "../run/Hero"
import { Run } from "../run/Run"
import { Carried } from "../usable/Usable"

import { cardLoader, savedCard } from "./battleSave"
import type { SavedCard } from "./battleSave"
import { HEART_NAMES, ITEM_NAMES, USABLE_NAMES } from "./catalogNames"
import { saveTravel } from "./travelSave"
import type { TravelSave } from "./travelSave"

/** The version of the shape of a run saved, raised whenever it changes, so an old one is refused clearly. */
export const RUN_SAVE_VERSION = 3

/** A character of the party, written down as a unit of a battle is. */
export interface SavedHero {
    readonly name: string
    readonly sprite: VisualData|string|null
    readonly controller: Controller
    readonly decks: readonly (readonly SavedCard[])[]

    /** The cards it plays as often as it wishes. */
    readonly unlimited: readonly SavedCard[]

    /** Each heart, by the name of its kind, and whether it is empty. */
    readonly hearts: readonly (readonly [string, boolean])[]

    readonly items: readonly string[]

    /** What it carries to use, each by name, with the charges it has left. */
    readonly usables: readonly (readonly [string, number])[]

    readonly bases: Partial<StatBases>
}

/**
 * A run between its fights, written down as JSON: what is its own, the party, the gold and the random
 * numbers, and its journey, which writes itself down.
 *
 * @remarks
 * The battle is not in it: as the journey does, it writes itself down, and goes its own way to the viewers.
 */
export interface RunSave {
    readonly version: number
    readonly rng: number
    readonly gold: number
    readonly heroes: readonly SavedHero[]
    readonly travel: TravelSave
}

/**
 * A run written down, to read back with {@link loadRun}.
 *
 * @throws {@link Error} During a battle, or out of the map of its journey.
 */
export function saveRun(run: Run): RunSave {
    if(run.battle) throw new Error("A run is written down between its fights, not during one.")
    return {
        version: RUN_SAVE_VERSION, rng: run.rng.state, gold: run.gold,
        heroes: run.heroes.map(savedHero),
        travel: saveTravel(run.travel),
    }
}

/**
 * The run a save writes down, on the map of its journey.
 *
 * @param report - Where the error of a listener goes: thrown on by default.
 * @throws {@link Error} When the save is of another version, or names something the catalog does not have.
 */
export function loadRun(save: RunSave, report?: ErrorSink): Run {
    const run = new Run(save.rng, report)
    run.load(save)
    return run
}

/**
 * The party a save writes down.
 *
 * @throws {@link Error} When the save is of another version, or names something the catalog does not have.
 */
export function heroesOf(save: RunSave): Hero[] {
    if(save.version !== RUN_SAVE_VERSION){
        throw new Error(`A run save of version ${save.version} cannot be loaded by version ${RUN_SAVE_VERSION}.`)
    }
    const card = cardLoader()
    return save.heroes.map(each => loadedHero(each, card))
}


function savedHero({ name, sprite, controller, decks, unlimited, hearts, items, usables, bases }: Hero): SavedHero {
    return {
        name, sprite: savedVisual(sprite), controller, bases,
        decks: decks.map(deck => deck.map(savedCard)), unlimited: unlimited.map(savedCard),
        hearts: hearts.map(heart => [heart.kind.name, heart.isEmpty]),
        items: items.map(item => item.name),
        usables: usables.map(each => [each.usable.name, each.charges]),
    }
}

function loadedHero(saved: SavedHero, card: (saved: SavedCard) => Card): Hero {
    const { name, sprite, controller, bases } = saved
    return hero({
        name, sprite: loadedVisual(sprite), controller, bases,
        decks: saved.decks.map(deck => deck.map(card)), unlimited: saved.unlimited.map(card),
        hearts: saved.hearts.map(([kind, isEmpty]) => new Heart(HEART_NAMES.of(kind), isEmpty)),
        items: saved.items.map(item => ITEM_NAMES.of(item)),
        usables: saved.usables.map(([usable, charges]) => new Carried(USABLE_NAMES.of(usable), charges)),
    })
}
