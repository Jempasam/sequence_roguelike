import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import { Observable } from "../base/Observable"
import { rgba } from "../base/Rgba"
import { Rng } from "../base/Rng"
import type { ErrorSink } from "../base/Observable"
import type { Rgba } from "../base/Rgba"
import { DeckAi } from "../ai/Bot"
import type { UnitController } from "../ai/UnitController"
import { Battle } from "../battle/Battle"
import { Team } from "../battle/Team"
import type { Card } from "../card/Card"
import type { Fight } from "../fight/Fight"
import { EMPTY_FIGHT } from "../fight/fights"
import { FIRST_FLOOR } from "../catalog/floors"
import { freeHalts } from "../catalog/halts"
import { TAVERN_HALT } from "../halt/subs/gift/TavernHalt"
import { STARTING_KITS } from "../catalog/kits"
import type { Kit } from "../catalog/kits"
import type { Monster } from "../catalog/monsters"
import { Heart, insertHeart } from "../heart/Heart"
import type { HeartKind } from "../heart/HeartKind"
import { BLACK_HEART } from "../heart/subs/BlackHeartKind"
import { BLUE_HEART } from "../heart/subs/BlueHeartKind"
import { EXPLOSIVE_HEART } from "../heart/subs/ExplosiveHeartKind"
import { GLASS_HEART } from "../heart/subs/GlassHeartKind"
import { PINK_HEART } from "../heart/subs/PinkHeartKind"
import { QUICK_HEART } from "../heart/subs/QuickHeartKind"
import { RED_HEART } from "../heart/subs/RedHeartKind"
import { SHIELD_HEART } from "../heart/subs/ShieldHeartKind"
import { THORN_HEART } from "../heart/subs/ThornHeartKind"
import { VITAL_HEART } from "../heart/subs/VitalHeartKind"
import type { Item } from "../item/Item"
import { loadBattle } from "../save/battleSave"
import type { BattleSave } from "../save/battleSave"
import { heroesOf, saveRun } from "../save/runSave"
import type { RunSave } from "../save/runSave"
import { Travel } from "../travel/Travel"
import { Carried } from "../usable/Usable"
import type { Usable } from "../usable/Usable"

import { allyOf, HERO_COLOR, heroOf, merged, recruitOf } from "./Hero"
import type { Hero } from "./Hero"

/** Hearts found as loot: a kind, and how many of it, which balances the kind. */
export interface HeartLoot {
    readonly heart: HeartKind
    readonly count: number
}

/** Something a character of the party was given. */
export interface Gain<T> {
    readonly hero: Hero
    readonly gained: T
}

/** Where a run stands: on its journey, in a battle, or over, the party fallen. */
export type RunPhase = "travel"|"battle"|"over"

/** What hearts found as loot are, for the player: their kind, how many, and what they do. */
export function heartLootText({ heart, count }: HeartLoot): Text {
    return concat("Cœur ", heart, " ×", String(count), " : ", heart.description)
}

/** The color the name of the team of the monsters is written in. */
const MONSTERS_COLOR: Rgba = rgba(0.95, 0.35, 0.3)

/** How much gold a run starts with. */
const STARTING_GOLD = 30

/** The hearts won at the end of a fight: those that come back, so they last the whole run. */
export const KEPT_LOOT_HEARTS: readonly HeartLoot[] = [
    { heart: RED_HEART, count: 2 }, { heart: PINK_HEART, count: 1 }, { heart: BLACK_HEART, count: 3 },
]

/** The hearts given at the hospital: those used once, gone for good once lost. */
export const SPENT_LOOT_HEARTS: readonly HeartLoot[] = [
    { heart: SHIELD_HEART, count: 2 }, { heart: THORN_HEART, count: 1 }, { heart: GLASS_HEART, count: 4 },
    { heart: EXPLOSIVE_HEART, count: 1 }, { heart: VITAL_HEART, count: 1 }, { heart: QUICK_HEART, count: 1 },
    { heart: BLUE_HEART, count: 3 },
]

/**
 * A run: a journey floor after floor, down layers of places, with the same party, who keep their wounds and
 * grow their decks. A place holds a fight or a visit; the boss of a floor opens its exits, to the floors it
 * leads to. It ends when the party falls.
 *
 * @remarks
 * It is the game as a whole: its {@link Travel}, the battle being fought, the party and its gold. As a
 * battle does, it tells what happens through its observables and moves only when told to: told a fight is
 * reached, whoever follows it calls {@link Run.startBattle}, and {@link Run.endBattle} once it showed that
 * battle to its end. Each change to the party goes through one of its methods, so each is told.
 */
export class Run {


    //// Triggers ////

    /** The run went into another phase. */
    public readonly phaseChanged: Observable<RunPhase>

    /** A battle starts, its first round left for whoever shows it to start. */
    /**
     * What plays the bots of every battle of the run, the AI of the game by default: each battle fought is given
     * it as its {@link Battle.bot}. Change it to change how the monsters play, from the next battle on.
     * Not saved: a run loaded plays its bots with the AI of the game.
     */
    public bot: UnitController = new DeckAi()

    public readonly battleStarted: Observable<Battle>

    /** The party fell: the run is over. */
    public readonly defeated: Observable<Run>

    /** The party has another amount of gold. */
    public readonly goldChanged: Observable<number>

    /** A character came into the party. */
    public readonly heroJoined: Observable<Hero>

    /** A character left the party. */
    public readonly heroLeft: Observable<Hero>

    /** The hearts of the base life of the party were filled. */
    public readonly partyHealed: Observable<readonly Hero[]>

    /** A deck of the party changed, or was made. */
    public readonly deckChanged: Observable<readonly Card[]>

    /** A character was given an item. */
    public readonly itemGained: Observable<Gain<Item>>

    /** A character was given a usable. */
    public readonly usableGained: Observable<Gain<Usable>>

    /** A character was given a heart. */
    public readonly heartGained: Observable<Gain<HeartKind>>

    /** A save was loaded: the party stands on the map it holds, and nothing else was told of it. */
    public readonly loaded: Observable<Run>


    //// State ////

    /** The team of the players. */
    public readonly heroesTeam = new Team("Héros", HERO_COLOR)

    /** The team of the monsters. */
    public readonly monstersTeam = new Team("Monstres", MONSTERS_COLOR)

    /** The party, heroes and allies, in the order they stand. */
    public readonly heroes: Hero[]

    /** The random numbers of the run: the journey, the monsters, the offers of the places. */
    public readonly rng: Rng

    /** The journey of the party, between the fights. */
    public readonly travel: Travel

    constructor(
        seed: number,

        /** Where the error of a listener goes: thrown on by default, so none is lost. */
        public readonly report: ErrorSink = rethrow,
    ){
        this.phaseChanged = new Observable(report)
        this.battleStarted = new Observable(report)
        this.defeated = new Observable(report)
        this.goldChanged = new Observable(report)
        this.heroJoined = new Observable(report)
        this.heroLeft = new Observable(report)
        this.partyHealed = new Observable(report)
        this.deckChanged = new Observable(report)
        this.itemGained = new Observable(report)
        this.usableGained = new Observable(report)
        this.heartGained = new Observable(report)
        this.loaded = new Observable(report)
        this.rng = new Rng(seed)
        this.heroes = STARTING_KITS.map(kit => heroOf(kit))
        this.travel = new Travel(this, FIRST_FLOOR.create(1))
        // The party starts alone: a tavern to hire, a tavern again, a free halt, before the floor itself.
        const bonus = this.rng.pick(freeHalts()) ?? TAVERN_HALT
        this.travel.journey.addEntries([TAVERN_HALT, TAVERN_HALT, bonus])
    }


    public get phase(): RunPhase { return this.#phase }

    /** The battle being fought, none out of one. */
    public get battle(): Battle|null { return this.#battle }

    public get gold(): number { return this.#gold }

    public set gold(gold: number){
        if(gold === this.#gold) return
        this.#gold = gold
        this.goldChanged.notify(gold)
    }

    /** Does it only wait to be told to go on: a fight reached, or the battle being fought over? */
    public get canAdvance(): boolean {
        return this.#fightReached || this.#battle?.phase === "over"
    }

    /**
     * Go on to what comes next: into the fight reached, or out of the battle over.
     *
     * @throws {@link Error} When it waits for neither.
     */
    public advance(): void {
        if(this.#fightReached) this.startBattle()
        else this.endBattle()
    }


    //// Saving ////

    /** Written down, to read back with {@link Run.load}: see {@link saveRun}. */
    public save(): RunSave {
        return saveRun(this)
    }

    /**
     * Stand where a save has it, on the map, in place: what listens to it stays, and only {@link Run.loaded}
     * and {@link Travel.loaded} are told.
     *
     * @throws {@link Error} When the save is of another version, or names what the catalog does not have.
     */
    public load(save: RunSave): void {
        this.heroes.splice(0, this.heroes.length, ...heroesOf(save))
        this.#gold = save.gold
        this.#phase = "travel"
        this.#battle = null
        this.#fight = null
        this.travel.load(save.travel)
        // Last: laying the map out drew numbers.
        this.rng.state = save.rng
        this.loaded.notify(this)
    }


    //// Fights ////

    /**
     * Fight the fight of the place the party reached, or a battle against the monsters of the place the party
     * stands on, the first of the map when it holds none, where it reached none: that battle becomes the one
     * being fought.
     *
     * @throws {@link Error} Out of the journey.
     */
    public startBattle(): void {
        if(this.#phase !== "travel") throw new Error(`A battle starts from the journey, not during ${this.#phase}.`)
        this.#fight = this.#fightReached ? this.travel.fight : this.#standIn()
        this.#enter(this.#fight!.battle)
    }

    /**
     * Fight a battle made elsewhere: it becomes the one being fought. The heroes are not tied to its units,
     * so the battle gives them back nothing when it ends.
     */
    public playBattle(battle: Battle): void {
        this.#fight = null
        this.#enter(battle)
    }

    /**
     * Watch a battle fought elsewhere: it becomes the one being fought, read from its save. The party stays
     * out of it, since nobody here calls {@link Run.endBattle}.
     *
     * @throws {@link Error} When the save is of another version, or names what the catalog does not have.
     */
    public joinBattle(save: BattleSave): void {
        this.playBattle(loadBattle(save))
    }

    #enter(battle: Battle): void {
        this.#battle = battle
        battle.bot = this.bot
        this.#enterPhase("battle")
        this.travel.startFight()
        this.battleStarted.notify(battle)
    }

    /**
     * A new battle against the monsters of the current place, its first round left for the screen to start,
     * to show its draw. The run does not fight it: {@link Run.startBattle} fights that of the fight reached.
     */
    public newBattle(): Battle {
        return this.#standIn().battle
    }

    /**
     * Take the party back from the battle fought, once over: their hearts and what they carry, as the
     * battle left them. A won fight leads to the halt of its place, or back to the map where there is none; a
     * lost one ends the run. Whoever shows the battle calls it once it showed its end.
     *
     * @throws {@link Error} When no battle is being fought, or it is not over.
     */
    public endBattle(): void {
        const battle = this.#battle
        if(!battle || battle.phase !== "over") throw new Error("Only a battle fought and over ends.")
        const result = this.#fight?.finish()
        const won = result ? result === "won" : battle.winner === this.heroesTeam
        this.#battle = null
        this.#fight = null
        if(!won){
            this.#enterPhase("over")
            this.defeated.notify(this)
            return
        }
        this.travel.endFight()
        this.#enterPhase("travel")
    }

    /** Back to the map from wherever the run stands: the battle fought and the visit open are left. */
    public backToMap(): void {
        this.#battle = null
        this.#fight = null
        this.travel.leave()
        this.#enterPhase("travel")
    }


    //// The party and the gold ////

    /**
     * Pay a price in gold.
     *
     * @throws {@link Error} When the party has less gold than that.
     */
    public spend(price: number): void {
        if(price > this.gold) throw new Error(`The party has ${this.gold} gold, not ${price}.`)
        this.gold -= price
    }

    /** Fill the hearts of the base life of the whole party. */
    public heal(): void {
        for(const hero of this.heroes){
            for(const heart of hero.hearts) if(heart.kind.base) heart.isEmpty = false
        }
        this.partyHealed.notify(this.heroes)
    }

    /**
     * Change a deck of the party, which is then told.
     *
     * @returns What the change gives.
     */
    public changeDeck<T>(deck: Card[], change: (deck: Card[]) => T): T {
        const result = change(deck)
        this.deckChanged.notify(deck)
        return result
    }

    /** Give a character an item. */
    public giveItem(hero: Hero, item: Item): void {
        hero.items.push(item)
        this.itemGained.notify({ hero, gained: item })
    }

    /** Give a character a usable. */
    public giveUsable(hero: Hero, usable: Usable): void {
        hero.usables.push(new Carried(usable))
        this.usableGained.notify({ hero, gained: usable })
    }

    /** Give a character hearts found as loot. */
    public giveHearts(hero: Hero, { heart, count }: HeartLoot): void {
        for(let given = 0; given < count; given++) this.giveHeart(hero, heart)
    }

    /** Give a character a full heart: one of the base life before the other kinds, which stay first lost. */
    public giveHeart(hero: Hero, kind: HeartKind): void {
        insertHeart(hero.hearts, new Heart(kind))
        this.heartGained.notify({ hero, gained: kind })
    }

    /** Hire a hero from a kit, at the end of the party. */
    public hire(kit: Kit): Hero {
        const hired = heroOf(kit, this.#freeName(kit.name))
        this.heroes.push(hired)
        this.heroJoined.notify(hired)
        return hired
    }

    /** Tame a monster as an ally, at the end of the party. */
    public tame(monster: Monster): Hero {
        const ally = allyOf(monster, this.#freeName(monster.name))
        this.heroes.push(ally)
        this.heroJoined.notify(ally)
        return ally
    }

    /** Recruit a monster as a hero the players plan, at the end of the party. */
    public recruit(monster: Monster): Hero {
        const recruit = recruitOf(monster, this.#freeName(monster.name))
        this.heroes.push(recruit)
        this.heroJoined.notify(recruit)
        return recruit
    }

    /**
     * Graft a monster on a character of the party, as the mad doctor does with two: the monster joins as an
     * ally, then the two are merged, standing where the character stood.
     *
     * @throws {@link Error} When the character is not in the party.
     */
    public graft(hero: Hero, monster: Monster): Hero {
        if(!this.heroes.includes(hero)) throw new Error(`${hero.name} is not in the party.`)
        const made = merged(hero, allyOf(monster, monster.name))
        this.heroes.splice(this.heroes.indexOf(hero), 1, made)
        this.heroLeft.notify(hero)
        this.heroJoined.notify(made)
        return made
    }

    /**
     * Merge two characters of the party into one, standing where the first stood, as the mad doctor does.
     *
     * @throws {@link Error} When the two are the same, or one is not in the party.
     */
    public merge(first: Hero, second: Hero): Hero {
        const at = this.heroes.indexOf(first)
        if(first === second || at < 0 || !this.heroes.includes(second)){
            throw new Error("The mad doctor merges two characters of the party.")
        }
        const made = merged(first, second)
        this.heroes.splice(at, 1, made)
        this.heroes.splice(this.heroes.indexOf(second), 1)
        this.heroLeft.notify(first)
        this.heroLeft.notify(second)
        this.heroJoined.notify(made)
        return made
    }

    /**
     * Send a character away from the party.
     *
     * @throws {@link Error} When it is not in the party.
     */
    public fire(hero: Hero): void {
        const at = this.heroes.indexOf(hero)
        if(at < 0) throw new Error(`${hero.name} is not in the party.`)
        this.heroes.splice(at, 1)
        this.heroLeft.notify(hero)
    }


    #phase: RunPhase = "travel"
    #battle: Battle|null = null
    #gold = STARTING_GOLD

    /** The fight being fought, none out of one or for a battle made elsewhere. */
    #fight: Fight|null = null

    /** Did the journey come to a fight no battle was started for yet? */
    get #fightReached(): boolean {
        return this.#phase === "travel" && this.travel.phase === "fight"
    }

    #enterPhase(phase: RunPhase): void {
        if(phase === this.#phase) return
        this.#phase = phase
        this.phaseChanged.notify(phase)
    }

    /** A fight of the current place, the first of the map when it holds none, an empty one when no place does. */
    #standIn(): Fight {
        const { place, journey } = this.travel
        const held = [place, ...journey.places].find(each => each?.fight)
        return (held?.fight ?? EMPTY_FIGHT).create(this, held ?? place ?? { layer: 0, across: 0.5 })
    }

    /** A name no character of the party has: the name, or the name and a number. */
    #freeName(name: string): string {
        const taken = (each: string) => this.heroes.some(hero => hero.name === each)
        let free = name
        for(let count = 2; taken(free); count++) free = `${name} ${count}`
        return free
    }
}

/** Throw an error on, for a run nothing listens to the errors of. */
function rethrow(error: unknown): void {
    throw error
}
