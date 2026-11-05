import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import { Observable } from "../base/Observable"
import { rgba } from "../base/Rgba"
import { Rng } from "../base/Rng"
import { Vector2 } from "../base/Vector2"
import type { ErrorSink } from "../base/Observable"
import type { Rgba } from "../base/Rgba"
import { Arena } from "../battle/Arena"
import { Battle } from "../battle/Battle"
import { Team } from "../battle/Team"
import { UNIT_RADIUS } from "../battle/Unit"
import type { Pillar } from "../battle/Arena"
import type { Unit } from "../battle/Unit"
import type { Card } from "../card/Card"
import { FIRST_FLOOR } from "../catalog/floors"
import { ITEMS } from "../catalog/index"
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
import { Travel } from "../travel/Travel"
import { Carried } from "../usable/Usable"
import type { Usable } from "../usable/Usable"

import { allyOf, firstDeck, HERO_COLOR, heroOf, merged, redHearts } from "./Hero"
import type { Hero } from "./Hero"
import type { FightKind, PlaceKind } from "./Journey"
import { inventedFusion, lootCard, lootCards } from "./offers"
import { CARTE } from "../base/keywords"

/** Something to take after a won battle. */
export type Reward =
    | { readonly kind: "card", readonly card: Card }
    | { readonly kind: "item", readonly item: Item }
    | { readonly kind: "heart", readonly loot: HeartLoot }

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

/**
 * Where a run stands: on its journey, in a battle, the rewards of a won one to take, or over, the party
 * fallen.
 */
export type RunPhase = "travel"|"battle"|"rewards"|"over"

/** What hearts found as loot are, for the player: their kind, how many, and what they do. */
export function heartLootText({ heart, count }: HeartLoot): Text {
    return concat("Cœur ", heart, " ×", String(count), " : ", heart.description)
}

/** What a reward is, for the player: its kind, its name, and what it does. */
export function rewardText(reward: Reward): Text {
    switch(reward.kind){
        case "card": return concat(CARTE.as("Carte"), " ", reward.card, " : ", reward.card.description)
        case "item": return concat("Objet ", reward.item, " : ", reward.item.description)
        case "heart": return heartLootText(reward.loot)
    }
}

/** The color the name of the team of the monsters is written in. */
const MONSTERS_COLOR: Rgba = rgba(0.95, 0.35, 0.3)

/** The size of the arena, in meters. */
export const ARENA_SIZE = 9

/** The size of the square the units and the pillars start in, in meters, in the middle of the arena. */
const FORMATION_SIZE = 7

/** How far the square the units start in stands from the walls, in meters. */
const FORMATION_INSET = (ARENA_SIZE - FORMATION_SIZE) / 2

/** How many pillars each arena holds. */
const PILLARS = 3

/** The radius of a pillar, in meters. */
const PILLAR_RADIUS = 0.45

/** How far apart two pillars stand at least, center to center, in meters: room to walk between. */
const PILLAR_SPACING = 2

/** How far a pillar stands at least from where a unit starts, beyond touching it, in meters. */
const PILLAR_CLEARANCE = 0.2

/** How many rewards are offered after a won battle. */
const REWARD_CHOICES = 3

/** How many characters of the party stand in a row at the start of a battle, and how far apart, in meters. */
const PARTY_ROW = 3
const PARTY_SPACING = 2

/** How much gold a run starts with. */
const STARTING_GOLD = 30

/** How much gold a won fight gives, by its kind, and how much more at random, at most. */
const FIGHT_GOLD: Readonly<Record<FightKind, number>> = { battle: 15, elite: 35, boss: 80 }
const GOLD_SPREAD = 10

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
    public readonly battleStarted: Observable<Battle>

    /** A battle was won: these are its rewards. */
    public readonly rewardsOffered: Observable<readonly Reward[]>

    /** A character took a reward. */
    public readonly rewardClaimed: Observable<Gain<Reward>>

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
        this.rewardsOffered = new Observable(report)
        this.rewardClaimed = new Observable(report)
        this.defeated = new Observable(report)
        this.goldChanged = new Observable(report)
        this.heroJoined = new Observable(report)
        this.heroLeft = new Observable(report)
        this.partyHealed = new Observable(report)
        this.deckChanged = new Observable(report)
        this.itemGained = new Observable(report)
        this.usableGained = new Observable(report)
        this.heartGained = new Observable(report)
        this.rng = new Rng(seed)
        this.heroes = STARTING_KITS.map(kit => heroOf(kit))
        this.travel = new Travel(this, FIRST_FLOOR.create(1))
    }


    public get phase(): RunPhase { return this.#phase }

    /** The battle being fought, none out of one. */
    public get battle(): Battle|null { return this.#battle }

    /** What the party may take of the battle it won, none out of the rewards. */
    public get rewards(): readonly Reward[] { return this.#rewards }

    public get gold(): number { return this.#gold }

    public set gold(gold: number){
        if(gold === this.#gold) return
        this.#gold = gold
        this.goldChanged.notify(gold)
    }


    //// Fights ////

    /** The kind of the fight of the place, a battle when the place holds none. */
    public get fight(): FightKind {
        const kind: PlaceKind|undefined = this.travel.place?.kind
        return kind === "elite" || kind === "boss" ? kind : "battle"
    }

    /**
     * Fight the current place: its battle becomes the one being fought.
     *
     * @throws {@link Error} Out of the journey.
     */
    public startBattle(): void {
        if(this.#phase !== "travel") throw new Error(`A battle starts from the journey, not during ${this.#phase}.`)
        const battle = this.newBattle()
        this.#battle = battle
        this.#enterPhase("battle")
        this.battleStarted.notify(battle)
    }

    /**
     * The battle of the current place, its first round left for the screen to start, to show its draw. The
     * run does not fight it: {@link Run.startBattle} does.
     */
    public newBattle(): Battle {
        const monsters = this.#monsters()
        const starts = this.#partyStarts()
        const battle = new Battle(this.#arena(starts), this.rng.int(2 ** 31))
        this.#units.clear()
        this.heroes.forEach((hero, index) => {
            const unit = battle.add({
                name: hero.name, sprite: hero.sprite, team: this.heroesTeam, controller: hero.controller,
                position: starts[index], direction: Vector2.UP,
                hearts: hero.hearts, decks: hero.decks, items: hero.items, usables: hero.usables,
                bases: hero.bases,
            })
            battle.refill(unit)
            this.#units.set(hero, unit)
        })
        monsters.forEach((monster, index) => {
            battle.add({
                name: `${monster.name} ${index + 1}`, sprite: monster.sprite, team: this.monstersTeam,
                controller: "bot",
                position: monsterStart(index), direction: Vector2.DOWN,
                hearts: redHearts(monster.hearts + this.travel.floor.level - 1), decks: [monster.cards],
                bases: {
                    draw: monster.draw, firstDraw: monster.draw, ordered: true, size: monster.size ?? 1,
                },
            })
        })
        return battle
    }

    /**
     * Take the party back from the battle fought, once over: their hearts and what they carry, as the
     * battle left them. A character who fell in a won battle stands up again with one heart. A won fight
     * gives gold and rewards to take; a lost one ends the run. Whoever shows the battle calls it once it
     * showed its end.
     *
     * @throws {@link Error} When no battle is being fought, or it is not over.
     */
    public endBattle(): void {
        const battle = this.#battle
        if(!battle || battle.phase !== "over") throw new Error("Only a battle fought and over ends.")
        const won = battle.winner === this.heroesTeam
        for(const hero of this.heroes){
            const unit = this.#units.get(hero)
            if(unit){
                hero.hearts = keptHearts(unit)
                hero.usables.splice(0, hero.usables.length, ...unit.usables)
            }
            const fell = !hero.hearts.some(heart => !heart.isEmpty)
            if(won && fell) hero.hearts[0] = new Heart(RED_HEART)
        }
        this.#battle = null
        if(!won){
            this.#enterPhase("over")
            this.defeated.notify(this)
            return
        }
        this.gold += FIGHT_GOLD[this.fight] + this.rng.int(GOLD_SPREAD + 1)
        this.#rewards = this.#drawRewards()
        this.#enterPhase("rewards")
        this.rewardsOffered.notify(this.#rewards)
    }

    /**
     * Give a reward offered to a character of the party, then go back to the map.
     *
     * @param deck - The deck a card goes to, the first by default.
     * @throws {@link Error} Out of the rewards, or when the reward is not one offered.
     */
    public claim(reward: Reward, hero: Hero, deck: Card[] = firstDeck(hero)): void {
        if(this.#phase !== "rewards") throw new Error(`Rewards are taken after a won battle, not during ${this.#phase}.`)
        if(!this.#rewards.includes(reward)) throw new Error("That reward is not one offered.")
        switch(reward.kind){
            case "card":
                this.changeDeck(deck, changed => changed.push(reward.card))
                break
            case "item":
                this.giveItem(hero, reward.item)
                break
            case "heart":
                this.giveHearts(hero, reward.loot)
                break
            default:
                throw new Error("A reward of an unknown kind was claimed.")
        }
        this.rewardClaimed.notify({ hero, gained: reward })
        this.backToMap()
    }

    /**
     * Take none of the rewards offered, and go back to the map.
     *
     * @throws {@link Error} Out of the rewards.
     */
    public skipReward(): void {
        if(this.#phase !== "rewards") throw new Error(`Rewards are left after a won battle, not during ${this.#phase}.`)
        this.backToMap()
    }

    /** Back to the map from wherever the run stands: the battle fought and the visit open are left. */
    public backToMap(): void {
        this.#battle = null
        this.#rewards = []
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
        const ally = allyOf(monster, this.#freeName(`${monster.name} allié`))
        this.heroes.push(ally)
        this.heroJoined.notify(ally)
        return ally
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
    #rewards: readonly Reward[] = []
    #gold = STARTING_GOLD

    /** The unit of each character in the battle being fought. */
    readonly #units = new Map<Hero, Unit>()

    #enterPhase(phase: RunPhase): void {
        if(phase === this.#phase) return
        this.#phase = phase
        this.phaseChanged.notify(phase)
    }

    /** What to choose from after a won fight: better after an elite or a boss. */
    #drawRewards(): Reward[] {
        const item = (): Reward => ({ kind: "item", item: this.rng.pick(ITEMS) ?? ITEMS[0] })
        const fusion = (): Reward => ({ kind: "card", card: inventedFusion(this.rng) })
        switch(this.fight){
            case "elite": return [{ kind: "card", card: lootCard(this.rng) }, item(), fusion()]
            case "boss": return [item(), item(), fusion()]
            case "battle": {
                const rewards: Reward[] = lootCards(this.rng, REWARD_CHOICES - 1).map(card => ({ kind: "card", card }))
                if(this.rng.chance(0.5)) rewards.push(item())
                else rewards.push({ kind: "heart", loot: this.rng.pick(KEPT_LOOT_HEARTS) ?? KEPT_LOOT_HEARTS[0] })
                return rewards
            }
            default: throw new Error("A fight of an unknown kind was won.")
        }
    }

    /** A name no character of the party has: the name, or the name and a number. */
    #freeName(name: string): string {
        const taken = (each: string) => this.heroes.some(hero => hero.name === each)
        let free = name
        for(let count = 2; taken(free); count++) free = `${name} ${count}`
        return free
    }

    /**
     * Where each character of the party starts: rows along the bottom of the formation, from the first, the
     * characters of a row centered across it.
     */
    #partyStarts(): Vector2[] {
        const count = this.heroes.length
        return this.heroes.map((_, index) => {
            const row = Math.floor(index / PARTY_ROW)
            const inRow = Math.min(PARTY_ROW, count - row * PARTY_ROW)
            const rank = index % PARTY_ROW
            const x = ARENA_SIZE / 2 + (rank - (inRow - 1) / 2) * PARTY_SPACING
            return new Vector2(x, FORMATION_INSET + FORMATION_SIZE - 0.5 - row)
        })
    }

    /**
     * An arena with its pillars in the middle rows, away from where the units start: the top rows of the
     * monsters, and where the party stands.
     */
    #arena(starts: readonly Vector2[]): Arena {
        const pillars: Pillar[] = []
        const clear = PILLAR_RADIUS + UNIT_RADIUS + PILLAR_CLEARANCE
        while(pillars.length < PILLARS){
            const x = FORMATION_INSET + 0.5 + this.rng.next() * (FORMATION_SIZE - 1)
            const y = FORMATION_INSET + 2.5 + this.rng.next() * (FORMATION_SIZE - 5)
            const center = new Vector2(x, y)
            const crowded = pillars.some(pillar => pillar.center.distance(center) < PILLAR_SPACING)
            const onStart = starts.some(start => start.distance(center) < clear)
            if(!crowded && !onStart) pillars.push({ center, radius: PILLAR_RADIUS })
        }
        return new Arena(ARENA_SIZE, ARENA_SIZE, pillars)
    }

    /** The monsters of the current place, those of the first fight of the map when it holds none. */
    #monsters(): readonly Monster[] {
        const { place, journey } = this.travel
        const fight = [place, ...journey.places].find(each => each?.monsters.length)
        return fight?.monsters ?? []
    }
}

/** Where a monster starts: every other meter along the top rows, from the second, in the middle of each. */
function monsterStart(index: number): Vector2 {
    const spot = 1 + index * 2
    const x = spot % FORMATION_SIZE + 0.5
    const y = Math.floor(spot / FORMATION_SIZE) + 0.5
    return new Vector2(FORMATION_INSET + x, FORMATION_INSET + y)
}

/** Throw an error on, for a run nothing listens to the errors of. */
function rethrow(error: unknown): void {
    throw error
}

/** The hearts a unit leaves its battle with: those left, even empty. */
function keptHearts(unit: Unit): Heart[] {
    return Heart.copies(unit.hearts.all)
}
