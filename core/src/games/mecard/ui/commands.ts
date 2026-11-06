import type { LayeredImagePath } from "../../../engine/assets"
import { command, group, named, optional, whole } from "../../../engine/console"
import { plainText } from "../../../semantic"
import type { Arg, Command, CommandContext, Console } from "../../../engine/console"
import { UnitStats } from "../sim/battle/Unit"
import { Rarity } from "../sim/card/Rarity"
import { ALL_CARDS, USABLES, ITEMS } from "../sim/catalog/index"
import { KITS } from "../sim/catalog/kits"
import { MONSTERS } from "../sim/catalog/monsters"
import { Heart, insertHeart } from "../sim/heart/Heart"
import { HEART_KINDS } from "../sim/save/catalogNames"
import { BLOODLUST, Bloodlust } from "../sim/status/subs/Bloodlust"
import { deckName } from "../sim/run/deckName"
import { allCards, firstDeck, hero } from "../sim/run/Hero"
import { isHalt } from "../sim/run/Journey"
import { FLOOR_TYPES } from "../sim/catalog/floors"
import { infoOf, PLACE_INFOS } from "../sim/catalog/places"
import { forge, weave } from "../sim/run/visits"
import { Burn, BURN } from "../sim/status/subs/Burn"
import { CONFUSED, Confusion } from "../sim/status/subs/Confusion"
import { Dodge, DODGE } from "../sim/status/subs/Dodge"
import { FRENZIED, Frenzy } from "../sim/status/subs/Frenzy"
import { Poison, POISONED } from "../sim/status/subs/Poison"
import { ENRAGED, Rage } from "../sim/status/subs/Rage"
import { Rooted, ROOTED } from "../sim/status/subs/Rooted"
import { SLOWED, Slowness } from "../sim/status/subs/Slowness"
import { Vulnerability, VULNERABLE } from "../sim/status/subs/Vulnerability"
import { WEAKENED, Weakness } from "../sim/status/subs/Weakness"
import type { Attribute } from "../sim/base/Attribute"
import type { Battle } from "../sim/battle/Battle"
import type { Controller, Unit } from "../sim/battle/Unit"
import type { Card } from "../sim/card/Card"
import type { Kit } from "../sim/catalog/kits"
import type { Monster } from "../sim/catalog/monsters"
import { Carried } from "../sim/usable/Usable"
import type { Usable } from "../sim/usable/Usable"
import type { HeartKind } from "../sim/heart/HeartKind"
import type { Item } from "../sim/item/Item"
import type { Hero } from "../sim/run/Hero"
import type { HaltKind, Place, PlaceInfo, PlaceKind } from "../sim/run/Journey"
import type { FloorType } from "../sim/floor/Floor"
import type { Run } from "../sim/run/Run"
import type { Status, StatusType } from "../sim/status/Status"
import { Rng } from "../sim/base/Rng"
import { COOP_SEATS, ENEMY_SEATS, FIXED_SEATS, randomSeats } from "../sync/run/Seats"
import type { SeatMode, SeatPolicy } from "../sync/run/Seats"

import { chainText, heartsText } from "./describe"
import { PLACE_TRANSITIONS } from "./travel/placeLooks"

/** What the commands of Dungeon of the Mecard run with: the run, its battle, the screen to build again. */
export interface MecardContext extends CommandContext {
    /** The run being played. */
    readonly run: Run

    /** The battle being fought. */
    readonly battle: Battle

    /** Build the screen again, after a command changed the battle. */
    refresh(): void

    /** Hear that cards left the hand of a unit: the chain planned for it, maybe holding them, starts over. */
    handChanged(unit: Unit): void

    /** Fight the current floor again, in a new battle. */
    newBattle(): void

    /** Start a new run, from its first floor. */
    restart(): void

    /** Go to a place the party may go to next: its fight, or its visit. */
    go(place: Place): void

    /** Show the map of the journey, the battle or the visit open left. */
    showMap(): void

    /** Visit a halt where the party stands, without going anywhere. */
    visit(kind: HaltKind): void

    /** Open the bench of the characters, where they are animated and dressed for a try. */
    showPnj(): void

    /** Open the bench of the forearm of the halts, where it points at the pointer for a try. */
    showArm(): void

    /** Open the catalogue of the cards, hearts, monsters and the rest of the game. */
    showLibrary(): void

    /** Play a transition over the screen, for a try, telling its middle and its end. */
    playTransition(path: LayeredImagePath, duration: number, reverse: boolean): void

    /**
     * Open the game to others, printing the code they connect with.
     *
     * @param mode - What they are given to play, none for others that only watch.
     * @throws {@link Error} When the game cannot be hosted now.
     */
    hostGame(mode: SeatMode|null, policy: SeatPolicy): void

    /**
     * Leave this game for the one hosted under a code.
     *
     * @param guest - Does the player come to play, rather than to watch?
     * @throws {@link Error} With no network.
     */
    connect(code: string, guest: boolean): void
}

/** What the game gives the context of the commands, read at each command. */
export interface MecardHost extends Omit<MecardContext, "run"|"battle"> {
    readonly run: Run
    readonly battle: Battle
}

/**
 * The context of the commands, reading the game at each command, so a command acts on the run and the
 * battle of the moment, however many the game went through.
 */
export class LiveContext implements MecardContext {


    constructor(
        /** The game, read each time. */
        public readonly host: () => MecardHost,
    ){}


    public get run(): Run { return this.host().run }
    public get battle(): Battle { return this.host().battle }
    public print(text: string): void { this.host().print(text) }
    public refresh(): void { this.host().refresh() }
    public handChanged(unit: Unit): void { this.host().handChanged(unit) }
    public newBattle(): void { this.host().newBattle() }
    public restart(): void { this.host().restart() }
    public go(place: Place): void { this.host().go(place) }
    public showMap(): void { this.host().showMap() }
    public visit(kind: HaltKind): void { this.host().visit(kind) }
    public showPnj(): void { this.host().showPnj() }
    public showArm(): void { this.host().showArm() }
    public showLibrary(): void { this.host().showLibrary() }
    public playTransition(path: LayeredImagePath, duration: number, reverse: boolean): void {
        this.host().playTransition(path, duration, reverse)
    }
    public hostGame(mode: SeatMode|null, policy: SeatPolicy): void { this.host().hostGame(mode, policy) }
    public connect(code: string, guest: boolean): void { this.host().connect(code, guest) }
}


//// What the commands know of the game ////

/** How many hearts a heal gives when none is said: a heart. */
const DEFAULT_HEAL = 2

/** How many names a line of a list holds, so it stays within the console. */
const NAMES_PER_LINE = 6

/** A status a command puts on a unit: its kind, and how it is made from a number, which some ignore. */
interface StatusMaker {
    readonly type: StatusType

    /** What the number stands for, none when the status takes none. */
    readonly amount: string|null
    readonly fallback: number
    make(amount: number): Status
}

/** The statuses a command puts on a unit. */
const STATUS_MAKERS: readonly StatusMaker[] = [
    { type: BURN, amount: "rounds", fallback: 2, make: rounds => new Burn(rounds) },
    { type: ROOTED, amount: "étapes", fallback: 2, make: steps => new Rooted(steps) },
    { type: DODGE, amount: null, fallback: 0, make: () => new Dodge() },
    { type: POISONED, amount: "rounds", fallback: 2, make: rounds => new Poison(rounds) },
    { type: SLOWED, amount: "rounds", fallback: 2, make: rounds => new Slowness(rounds) },
    { type: WEAKENED, amount: "rounds", fallback: 2, make: rounds => new Weakness(rounds) },
    { type: ENRAGED, amount: "rounds", fallback: 2, make: rounds => new Rage(rounds) },
    { type: CONFUSED, amount: "rounds", fallback: 2, make: rounds => new Confusion(rounds) },
    { type: VULNERABLE, amount: "rounds", fallback: 2, make: rounds => new Vulnerability(rounds) },
    { type: FRENZIED, amount: "rounds", fallback: 2, make: rounds => new Frenzy(rounds) },
    { type: BLOODLUST, amount: "rounds", fallback: 3, make: rounds => new Bloodlust(rounds) },
]

/** The name of a stat of a unit, as typed. */
type AttributeName = keyof UnitStats

/** Stats as a unit starts with, to tell which hold a number and which a yes or no. */
const FRESH_STATS = new UnitStats()

/** The stats of a unit, in the order they are written. */
const ATTRIBUTES = Object.keys(FRESH_STATS) as AttributeName[]

/** Does a stat hold a yes or no rather than a number? */
function isFlag(name: unknown): boolean {
    return typeof FRESH_STATS[name as AttributeName].base === "boolean"
}

/** The word a name is typed as: its spaces made `_`, since a line splits on spaces. */
function wordOf(name: string): string {
    return name.replaceAll(" ", "_")
}


//// Arguments ////

const UNIT: Arg<MecardContext, Unit> = named("l'unité", ctx => ctx.battle.living, unit => wordOf(unit.name))
const HERO: Arg<MecardContext, Hero> = named("le héros", ctx => ctx.run.heroes, hero => wordOf(hero.name))
const CARD: Arg<MecardContext, Card> = named("la carte", () => ALL_CARDS, card => wordOf(card.name))
const ITEM: Arg<MecardContext, Item> = named("l'objet", () => ITEMS, item => wordOf(item.name))
const HEART: Arg<MecardContext, HeartKind> = named("le cœur", () => HEART_KINDS, kind => wordOf(kind.name))
const MONSTER: Arg<MecardContext, Monster> = named("le monstre", () => MONSTERS, monster => wordOf(monster.name))
const RARITY: Arg<MecardContext, Rarity> = named("la rareté", () => Rarity.ALL, rarity => rarity.name)
const STATUS: Arg<MecardContext, StatusMaker> = named("le statut", () => STATUS_MAKERS, maker => wordOf(maker.type.name))
const ATTRIBUTE: Arg<MecardContext, AttributeName> = named("l'attribut", () => ATTRIBUTES, name => name)

/** A card among those of the unit or the hero read just before it: its hand, its pile. */
function cardAmong<T>(cardsOf: (owner: T) => readonly Card[]): Arg<MecardContext, Card> {
    return named("la carte", (_, before) => {
        const owner = before.at(-1) as T|undefined
        return owner ? [...new Set(cardsOf(owner))] : []
    }, card => wordOf(card.name))
}

/** A card of the deck of the hero read first, whatever was read after it. */
const HERO_CARD: Arg<MecardContext, Card> = named("la carte", (_, [hero]) => {
    return hero ? [...new Set(allCards(hero as Hero))] : []
}, card => wordOf(card.name))

/** The deck of a hero holding every card given, the first when none does: what acts on it then says so. */
function deckHolding(hero: Hero, cards: readonly Card[]): Card[] {
    return hero.decks.find(deck => cards.every(card => deck.includes(card))) ?? firstDeck(hero)
}

/** The word a place the party may go to is typed as: its name, then its rank among those, from 1. */
function placeWord(place: Place, rank: number): string {
    return `${wordOf(infoOf(place).name)}_${rank + 1}`
}

/** A place the party may go to next, typed by its name and its rank among those. */
const NEXT_PLACE: Arg<MecardContext, Place> = {
    complete: ctx => ctx.run.travel.next.map(placeWord),
    read: (ctx, word) => {
        if(word === undefined) return new Error("Il manque le lieu.")
        const lower = word.toLowerCase()
        const place = ctx.run.travel.next.find((each, rank) => placeWord(each, rank).toLowerCase() === lower)
        return place ?? new Error(`Le lieu « ${word} » n'est pas un lieu où aller.`)
    },
}

/** The halts, as `travel visit` opens them. */
const VISIT_KINDS = (Object.keys(PLACE_INFOS) as PlaceKind[]).filter(isHalt)

/** The halts a command lays on the map: all but the exits, which come with the map. */
const LAYABLE_KINDS = VISIT_KINDS.filter((kind): kind is Exclude<HaltKind, "exit"> => kind !== "exit")

/** The word a kind of place is typed as: its name. */
function kindWord(kind: PlaceKind): string {
    return wordOf(PLACE_INFOS[kind].name)
}

const VISIT: Arg<MecardContext, HaltKind> = named("la halte", () => VISIT_KINDS, kindWord)
const FLOOR: Arg<MecardContext, FloorType> = named("l'étage", () => FLOOR_TYPES, type => wordOf(type.name))
const KIT: Arg<MecardContext, Kit> = named("le kit", () => KITS, kit => wordOf(kit.name))
const USABLE: Arg<MecardContext, Usable> = named("l'utilisable", () => USABLES, each => wordOf(each.name))

/** Who plays a character: the players, or a bot. */
const CONTROLLER: Arg<MecardContext, Controller> = named("le contrôle", () => ["player", "bot"] as const,
    controller => controller === "player" ? "joueur" : "bot")

/** What the others are given to play in a game hosted, none when they only watch. */
const HOST_MODE = named("le mode", () => [
    { word: "spectate", seats: null },
    { word: "coop", seats: COOP_SEATS },
    { word: "enemy", seats: ENEMY_SEATS },
] as const, mode => mode.word)

/** How what the others are given is picked: the first free, or any, the numbers of the run left alone. */
const FIXED_SEATING = { word: "fixed", policy: (): SeatPolicy => FIXED_SEATS }
const RANDOM_SEATING = {
    word: "random", policy: (run: Run): SeatPolicy => randomSeats(new Rng(run.rng.state)),
}
const SEATING = named("la répartition", () => [FIXED_SEATING, RANDOM_SEATING], seating => seating.word)

/** The code of a game hosted, as its host printed it. */
const ROOM_CODE: Arg<MecardContext, string> = {
    complete: () => [],
    read: (_, word) => word ?? new Error("Il manque le code de la partie."),
}

/** Why a player connects to a game. */
const INTENT = named("l'intention", () => [
    { word: "spectate", guest: false },
    { word: "play", guest: true },
] as const, intent => intent.word)

/** A character of the party other than the one read first. */
const OTHER_HERO: Arg<MecardContext, Hero> = named("le héros", (ctx, [first]) => {
    return ctx.run.heroes.filter(each => each !== first)
}, each => wordOf(each.name))

/** A status the unit read just before it holds. */
const HELD_STATUS: Arg<MecardContext, StatusType> = named("le statut", (_, [unit]) => {
    return unit ? [...(unit as Unit).statuses.keys()] : []
}, type => wordOf(type.name))

/** The value an attribute read just before it takes: a number, or a yes or no. */
const ATTRIBUTE_VALUE: Arg<MecardContext, number|boolean> = {
    complete: (_, [, name]) => isFlag(name) ? ["oui", "non"] : [],
    read: (_, word, [, name]) => {
        if(word === undefined) return new Error("Il manque la valeur.")
        if(isFlag(name)){
            const lower = word.toLowerCase()
            if(["oui", "true", "1"].includes(lower)) return true
            if(["non", "false", "0"].includes(lower)) return false
            return new Error("La valeur : oui ou non.")
        }
        const value = Number(word)
        return Number.isFinite(value) ? value : new Error("La valeur : un nombre.")
    },
}


//// Text ////

/** The names of cards, the copies counted: `Pas ×3, Recul`. */
function countedNames(cards: readonly Card[]): string[] {
    const counts = new Map<string, number>()
    for(const card of cards) counts.set(card.name, (counts.get(card.name) ?? 0) + 1)
    return [...counts].map(([name, count]) => count > 1 ? `${name} ×${count}` : name)
}

/** Print names under a title, a few on each line, `(rien)` when there are none. */
function printNames(ctx: MecardContext, title: string, names: readonly string[]): void {
    if(names.length === 0){
        ctx.print(`${title} : (rien)`)
        return
    }
    for(let i = 0; i < names.length; i += NAMES_PER_LINE){
        const line = names.slice(i, i + NAMES_PER_LINE).join(", ")
        ctx.print(i === 0 ? `${title} : ${line}` : `  ${line}`)
    }
}

/** Each heart, empty ones told: `rouge, rouge vide, bouclier`. */
function heartList(hearts: readonly Heart[]): string {
    return hearts.join(", ") || "(aucun)"
}



/** Take one copy of a card out of cards, and say whether it was there. */
function takeOut(cards: Card[], card: Card): boolean {
    const index = cards.lastIndexOf(card)
    if(index >= 0) cards.splice(index, 1)
    return index >= 0
}


//// Commands ////

/** The commands that tell what the game holds and change the cards: `card`, `item`, `status`, ... */
function catalogCommands(): Record<string, Command<MecardContext, unknown>> {
    return {
        card: group("card", "les cartes du jeu.", {
            list: command("card list [rareté] : liste les cartes, d'une rareté ou toutes.", [optional(RARITY, null)],
                (ctx, rarity) => {
                    for(const card of ALL_CARDS){
                        if(!rarity || card.rarity === rarity) ctx.print(`${wordOf(card.name)} (${card.rarity}) : ${plainText(card.description)}`)
                    }
                }),
            info: command("card info <carte> : décrit une carte.", [CARD], (ctx, card) => {
                ctx.print(`${card.name} (${card.rarity}) : ${plainText(card.description)}`)
                ctx.print(`Donne ${card.output.name}${card.input ? `, prend ${card.input.name}` : ""}.`)
                if(card.contents) ctx.print(`Contient ${card.contents.join(", ")}.`)
            }),
        }),
        item: group("item", "les objets.", {
            list: command("item list : liste les objets.", [], ctx => {
                for(const item of ITEMS) ctx.print(`${wordOf(item.name)} : ${plainText(item.description)}`)
            }),
            give: command("item give <unité> <objet> : équipe une unité pour ce combat.", [UNIT, ITEM],
                (ctx, unit, item) => {
                    ctx.battle.equip(unit, item)
                    ctx.print(`${item.name} équipé sur ${unit.name}.`)
                    ctx.refresh()
                }),
        }),
        status: group("status", "les statuts des unités.", {
            list: command("status list : liste les statuts.", [], ctx => {
                for(const maker of STATUS_MAKERS){
                    const amount = maker.amount ? ` [${maker.amount}, ${maker.fallback} par défaut]` : ""
                    ctx.print(`${wordOf(maker.type.name)}${amount}`)
                }
            }),
            add: command("status add <unité> <statut> [nombre] : met un statut.",
                [UNIT, STATUS, optional(whole("le nombre", 1), null)], (ctx, unit, maker, amount) => {
                    ctx.battle.applyStatus(unit, maker.make(amount ?? maker.fallback))
                    ctx.print(`${unit.name} : ${unit.statusOf(maker.type)?.toString() ?? "rien"}.`)
                    ctx.refresh()
                }),
            remove: command("status remove <unité> <statut> : retire un statut.", [UNIT, HELD_STATUS],
                (ctx, unit, type) => {
                    ctx.battle.removeStatus(unit, type)
                    ctx.print(`${unit.name} n'a plus ${type.name}.`)
                    ctx.refresh()
                }),
        }),
        heart: group("heart", "les cœurs.", {
            list: command("heart list : liste les sortes de cœurs.", [], ctx => {
                for(const kind of HEART_KINDS){
                    ctx.print(`${wordOf(kind.name)} : ${plainText(kind.description)}`)
                }
            }),
            add: command("heart add <unité> <cœur> : donne un cœur plein.", [UNIT, HEART], (ctx, unit, kind) => {
                unit.hearts.give(new Heart(kind))
                ctx.print(`${unit.name} : ${heartList(unit.hearts.all)}.`)
                ctx.refresh()
            }),
        }),
        monster: group("monster", "les sortes de monstres.", {
            list: command("monster list : liste les monstres.", [], ctx => {
                for(const monster of MONSTERS){
                    ctx.print(`${wordOf(monster.name)} : ${monster.hearts} cœurs, ${monster.draw} cartes par round`)
                }
            }),
            info: command("monster info <monstre> : décrit un monstre et la boucle de son deck.", [MONSTER],
                (ctx, monster) => {
                    ctx.print(`${monster.name} : ${monster.hearts} cœurs, ${monster.draw} cartes par round.`)
                    for(let i = 0; i < monster.cards.length; i += monster.draw){
                        const round = monster.cards.slice(i, i + monster.draw).map(card => card.name)
                        ctx.print(`  Round ${i / monster.draw + 1} : ${round.join(", ")}`)
                    }
                }),
        }),
    }
}

/** The commands acting on the units of the battle: `unit`, `attr`, `hand`, `deck`, `battle`. */
function battleCommands(): Record<string, Command<MecardContext, unknown>> {
    return {
        process: group("process", "les processus en cours.", {
            list: command("process list : liste les processus en cours de chaque unité.", [], ctx => {
                const going = ctx.battle.living.filter(unit => unit.processes.length > 0)
                for(const unit of going) ctx.print(`${wordOf(unit.name)} : ${unit.processes.join(", ")}`)
                if(going.length === 0) ctx.print("Aucun processus en cours.")
            }),
        }),
        unit: group("unit", "les unités du combat.", {
            list: command("unit list : liste les unités, leurs cœurs et leur place.", [], ctx => {
                for(const unit of ctx.battle.living){
                    const statuses = [...unit.statuses.values()].join(", ")
                    const team = unit.team.name
                    ctx.print(`${wordOf(unit.name)} (${team}) ${heartsText(unit)} en ${unit.position}${statuses ? ` · ${statuses}` : ""}`)
                }
            }),
            info: command("unit info <unité> : décrit une unité.", [UNIT], (ctx, unit) => {
                const who = unit.controller === "player" ? "joueur" : "bot"
                ctx.print(`${unit.name} : ${unit.team.name}, ${who}${unit.vanishing ? ", temporaire" : ""}.`)
                ctx.print(`En ${unit.position}, regarde ${unit.direction}.`)
                ctx.print(`Cœurs ${heartsText(unit)} : ${heartList(unit.hearts.all)}.`)
                const statuses = [...unit.statuses.values()].map(String)
                ctx.print(`Statuts : ${statuses.join(", ") || "(aucun)"}.`)
                ctx.print(`Objets : ${unit.items.map(item => item.name).join(", ") || "(aucun)"}.`)
                ctx.print(`Main ${unit.hand.length} · pioche ${unit.decks.piles.length} · défausse ${unit.decks.discards.length} · étapes restantes ${unit.stepsLeft}.`)
                const plan = ctx.battle.planOf(unit)
                if(plan) ctx.print(`Chaîne : ${chainText(plan.view(false))}.`)
            }),
            heal: command("unit heal <unité> [cœurs] : soigne, d'un cœur par défaut.",
                [UNIT, optional(whole("les cœurs", 1), DEFAULT_HEAL)], (ctx, unit, halves) => {
                    unit.hearts.heal(halves)
                    ctx.print(`${unit.name} : ${heartsText(unit)}.`)
                    ctx.refresh()
                }),
            damage: command("unit damage <unité> <cœurs> : blesse.", [UNIT, whole("les cœurs", 1)],
                (ctx, unit, halves) => {
                    unit.hearts.damage(halves, "physical", null)
                    ctx.print(`${unit.name} : ${heartsText(unit)}.`)
                    ctx.refresh()
                }),
            kill: command("unit kill <unité> : tue l'unité.", [UNIT], (ctx, unit) => {
                unit.hearts.slay(null)
                ctx.print(`${unit.name} est mort.`)
                ctx.refresh()
            }),
        }),
        attr: group("attr", "les attributs des unités, que les objets et les statuts modifient.", {
            list: command("attr list <unité> : liste les attributs, leur valeur et leur base.", [UNIT], (ctx, unit) => {
                for(const name of ATTRIBUTES) ctx.print(`${name} : ${unit.stats[name]}`)
            }),
            set: command("attr set <unité> <attribut> <valeur> : change la base d'un attribut.",
                [UNIT, ATTRIBUTE, ATTRIBUTE_VALUE], (ctx, unit, name, value) => {
                    const attribute = unit.stats[name] as Attribute<number|boolean>
                    attribute.base = value
                    ctx.print(`${unit.name} : ${name} vaut ${unit.stats[name]}.`)
                    ctx.refresh()
                }),
        }),
        hand: group("hand", "les mains des unités.", {
            list: command("hand list [unité] : montre la main d'une unité, ou de toutes.", [optional(UNIT, null)],
                (ctx, unit) => {
                    for(const each of unit ? [unit] : ctx.battle.living){
                        printNames(ctx, `${wordOf(each.name)} (${each.hand.length}/${each.stats.handSize.value})`, countedNames(each.hand))
                    }
                }),
            add: command("hand add <unité> <carte> : met une carte dans la main.", [UNIT, CARD], (ctx, unit, card) => {
                unit.hand.push(card)
                ctx.print(`${card.name} dans la main de ${unit.name}.`)
                ctx.refresh()
            }),
            remove: command("hand remove <unité> <carte> : retire une carte de la main.",
                [UNIT, cardAmong((unit: Unit) => unit.hand)], (ctx, unit, card) => {
                    takeOut(unit.hand, card)
                    ctx.print(`${card.name} retirée de la main de ${unit.name}.`)
                    ctx.handChanged(unit)
                    ctx.refresh()
                }),
            discard: command("hand discard <unité> [carte] : défausse une carte, ou toute la main.",
                [UNIT, optional(cardAmong((unit: Unit) => unit.hand), null)], (ctx, unit, card) => {
                    const cards = card ? [card] : [...unit.hand]
                    for(const each of cards) if(takeOut(unit.hand, each)) unit.decks.discard(each)
                    ctx.print(`${unit.name} défausse ${cards.length} carte${cards.length > 1 ? "s" : ""}.`)
                    ctx.handChanged(unit)
                    ctx.refresh()
                }),
            clear: command("hand clear <unité> : vide la main, les cartes perdues.", [UNIT], (ctx, unit) => {
                unit.hand.length = 0
                ctx.print(`La main de ${unit.name} est vide.`)
                ctx.handChanged(unit)
                ctx.refresh()
            }),
            draw: command("hand draw <unité> [nombre] : pioche, une carte par défaut, main pleine ou non.",
                [UNIT, optional(whole("le nombre", 1), 1)], (ctx, unit, count) => {
                    const drawn: Card[] = []
                    for(let i = 0; i < count; i++){
                        const next = unit.decks.draw(ctx.battle.rng)
                        if(!next) break
                        unit.hand.push(next.card)
                        drawn.push(next.card)
                    }
                    printNames(ctx, `${unit.name} pioche`, drawn.map(card => card.name))
                    ctx.refresh()
                }),
        }),
        deck: group("deck", "les pioches et les défausses des unités.", {
            list: command("deck list <unité> : montre chaque pioche, la prochaine carte d'abord, et sa défausse.", [UNIT],
                (ctx, unit) => {
                    if(unit.decks.all.length === 0) ctx.print(`${unit.name} n'a aucun deck.`)
                    unit.decks.all.forEach((deck, index) => {
                        const head = unit.decks.all.length > 1 ? `${deckName(index, unit.decks.all.length)} · ` : ""
                        const next = [...deck.pile].reverse().map(card => card.name)
                        printNames(ctx, `${head}Pioche (${deck.pile.length})`, next)
                        printNames(ctx, `${head}Défausse (${deck.discard.length})`, deck.discard.map(card => card.name))
                    })
                }),
            add: command("deck add <unité> <carte> : met une carte sur la première pioche.", [UNIT, CARD],
                (ctx, unit, card) => {
                    const [first] = unit.decks.all
                    if(!first){
                        ctx.print(`${unit.name} n'a aucun deck.`)
                        return
                    }
                    first.pile.push(card)
                    ctx.print(`${card.name} sur la pioche de ${unit.name}.`)
                    ctx.refresh()
                }),
            remove: command("deck remove <unité> <carte> : retire une carte d'une pioche, sinon d'une défausse.",
                [UNIT, cardAmong((unit: Unit) => [...unit.decks.piles, ...unit.decks.discards])],
                (ctx, unit, card) => {
                    const { all } = unit.decks
                    const fromPile = all.some(deck => takeOut(deck.pile, card))
                    if(!fromPile) all.some(deck => takeOut(deck.discard, card))
                    ctx.print(`${card.name} retirée du deck de ${unit.name}.`)
                    ctx.refresh()
                }),
            shuffle: command("deck shuffle <unité> : rebat chaque pioche.", [UNIT], (ctx, unit) => {
                for(const deck of unit.decks.all) ctx.battle.rng.shuffle(deck.pile)
                ctx.print(`La pioche de ${unit.name} est rebattue.`)
            }),
            recycle: command("deck recycle <unité> : remet chaque défausse sous sa pioche.", [UNIT], (ctx, unit) => {
                unit.decks.recycle(ctx.battle.rng)
                ctx.print(`${unit.name} : pioche ${unit.decks.piles.length}, défausse vide.`)
                ctx.refresh()
            }),
            clear: command("deck clear <unité> : vide les pioches et les défausses.", [UNIT], (ctx, unit) => {
                for(const deck of unit.decks.all){
                    deck.pile.length = 0
                    deck.discard.length = 0
                }
                ctx.print(`Le deck de ${unit.name} est vide.`)
                ctx.refresh()
            }),
        }),
        battle: group("battle", "le combat en cours.", {
            info: command("battle info : le round, la phase, l'initiative.", [], ctx => {
                const { battle } = ctx
                ctx.print(`Round ${battle.round}, phase ${battle.phase}${battle.winner ? `, gagné par ${battle.winner.name}` : ""}.`)
                printNames(ctx, "Initiative", battle.initiative.filter(unit => unit.alive).map(unit => wordOf(unit.name)))
                printNames(ctx, "Dangers", battle.living.filter(unit => unit.zone).map(unit => wordOf(unit.name)))
            }),
            win: command("battle win : tue tous les ennemis des héros.", [], ctx => {
                for(const unit of ctx.battle.living){
                    if(unit.team !== ctx.run.heroesTeam) unit.hearts.slay(null)
                }
                ctx.print("Les ennemis sont tombés.")
                ctx.refresh()
            }),
            reset: command("battle reset : refait le combat de ce lieu, avec de nouveaux monstres.", [], ctx => {
                ctx.newBattle()
                ctx.print(`Nouveau combat, ${floorText(ctx.run)}.`)
            }),
        }),
    }
}

/** The commands acting on the run, kept from one battle to the next: a change to a hero shows next battle. */
function runCommands(): Record<string, Command<MecardContext, unknown>> {
    const nextBattle = "(au prochain combat)"
    return {
        run: group("run", "la run : les héros, d'un combat à l'autre.", {
            info: command("run info : l'étage, la profondeur, l'or et l'équipe.", [], ctx => {
                ctx.print(`${floorText(ctx.run)}, profondeur ${ctx.run.travel.depth}, ${ctx.run.gold} or.`)
                for(const each of ctx.run.heroes){
                    const carried = [...each.items, ...each.usables].map(String).join(", ")
                    const bot = each.controller === "bot" ? " (bot)" : ""
                    ctx.print(`${wordOf(each.name)}${bot} : ${heartList(each.hearts)} · ${allCards(each).length} cartes${carried ? ` · ${carried}` : ""}`)
                }
            }),
            hero: command("run hero <héros> : décrit un héros, son deck, ses objets et ses utilisables.", [HERO],
                (ctx, hero) => {
                    ctx.print(`${hero.name}${hero.controller === "bot" ? " (bot)" : ""} : ${heartList(hero.hearts)}.`)
                    hero.decks.forEach((deck, index) => {
                        printNames(ctx, `${deckName(index, hero.decks.length)} (${deck.length})`, countedNames(deck))
                    })
                    printNames(ctx, "Objets", hero.items.map(item => item.name))
                    printNames(ctx, "Utilisables", hero.usables.map(String))
                }),
            addcard: command("run addcard <héros> <carte> : ajoute une carte au premier deck d'un héros.", [HERO, CARD],
                (ctx, hero, card) => {
                    firstDeck(hero).push(card)
                    ctx.print(`${card.name} dans le deck de ${hero.name} ${nextBattle}.`)
                    ctx.refresh()
                }),
            removecard: command("run removecard <héros> <carte> : retire une carte du deck d'un héros.",
                [HERO, cardAmong((hero: Hero) => allCards(hero))], (ctx, hero, card) => {
                    hero.decks.some(deck => takeOut(deck, card))
                    ctx.print(`${card.name} retirée du deck de ${hero.name} ${nextBattle}.`)
                    ctx.refresh()
                }),
            item: command("run item <héros> <objet> : donne un objet à un héros.", [HERO, ITEM], (ctx, hero, item) => {
                hero.items.push(item)
                ctx.print(`${item.name} pour ${hero.name} ${nextBattle}.`)
                ctx.refresh()
            }),
            unitem: command("run unitem <héros> <objet> : reprend un objet à un héros.",
                [HERO, named("l'objet", (_, [hero]) => hero ? (hero as Hero).items : [], item => wordOf(item.name))],
                (ctx, hero, item) => {
                    hero.items.splice(hero.items.lastIndexOf(item), 1)
                    ctx.print(`${item.name} repris à ${hero.name} ${nextBattle}.`)
                    ctx.refresh()
                }),
            heart: command("run heart <héros> <cœur> : donne un cœur plein à un héros.", [HERO, HEART],
                (ctx, hero, kind) => {
                    insertHeart(hero.hearts, new Heart(kind))
                    ctx.print(`${hero.name} : ${heartList(hero.hearts)} ${nextBattle}.`)
                    ctx.refresh()
                }),
            heal: command("run heal <héros> : remplit les cœurs rouges d'un héros.", [HERO], (ctx, hero) => {
                for(const heart of hero.hearts) if(heart.kind.base) heart.isEmpty = false
                ctx.print(`${hero.name} : ${heartList(hero.hearts)} ${nextBattle}.`)
                ctx.refresh()
            }),
            gold: command("run gold [or] : montre l'or, ou le change.", [optional(whole("l'or", 0), null)],
                (ctx, gold) => {
                    if(gold !== null) ctx.run.gold = gold
                    ctx.print(`${ctx.run.gold} or.`)
                    ctx.refresh()
                }),
            fuse: command("run fuse <héros> <carte> <carte> : colle deux cartes du deck d'un héros.",
                [HERO, HERO_CARD, HERO_CARD], (ctx, hero, first, second) => {
                    const fusion = forge(deckHolding(hero, [first, second]), [first, second])
                    ctx.print(`${fusion.name} dans le deck de ${hero.name} ${nextBattle}.`)
                    ctx.refresh()
                }),
            weave: command("run weave <héros> <ensemble|hasard> <carte> <carte> : lie deux cartes du deck d'un héros, comme le Tisserand.",
                [HERO, named("la façon", () => ["ensemble", "hasard"], word => word), HERO_CARD, HERO_CARD],
                (ctx, hero, mode, first, second) => {
                    const card = weave(deckHolding(hero, [first, second]), [first, second], mode === "ensemble" ? "merged" : "random")
                    ctx.print(`${card.name} dans le deck de ${hero.name} ${nextBattle}.`)
                    ctx.refresh()
                }),
            usable: command("run usable <héros> <utilisable> : donne un utilisable à un héros.",
                [HERO, USABLE], (ctx, hero, usable) => {
                    hero.usables.push(new Carried(usable))
                    ctx.print(`${usable.name} pour ${hero.name} ${nextBattle}.`)
                    ctx.refresh()
                }),
            unusable: command("run unusable <héros> <utilisable> : reprend un utilisable à un héros.",
                [HERO, named("l'utilisable", (_, [hero]) => hero ? (hero as Hero).usables : [], each => wordOf(each.usable.name))],
                (ctx, hero, carried) => {
                    hero.usables.splice(hero.usables.lastIndexOf(carried), 1)
                    ctx.print(`${carried.usable.name} repris à ${hero.name} ${nextBattle}.`)
                    ctx.refresh()
                }),
            hire: command("run hire <kit> : un héros de ce kit rejoint l'équipe, comme à la taverne.", [KIT],
                (ctx, kit) => {
                    ctx.print(`${ctx.run.hire(kit).name} rejoint l'équipe ${nextBattle}.`)
                    ctx.refresh()
                }),
            tame: command("run tame <monstre> : ce monstre rejoint l'équipe, joué par un bot, comme au dresseur.",
                [MONSTER], (ctx, monster) => {
                    ctx.print(`${ctx.run.tame(monster).name} rejoint l'équipe ${nextBattle}.`)
                    ctx.refresh()
                }),
            merge: command("run merge <héros> <héros> : greffe deux unités en une, comme le Docteur Fou.",
                [HERO, OTHER_HERO], (ctx, first, second) => {
                    ctx.print(`${ctx.run.merge(first, second).name} est né ${nextBattle}.`)
                    ctx.refresh()
                }),
            fire: command("run fire <héros> : renvoie une unité de l'équipe.", [HERO], (ctx, hero) => {
                if(ctx.run.heroes.length === 1) throw new Error("L'équipe garde au moins une unité.")
                ctx.run.fire(hero)
                ctx.print(`${hero.name} quitte l'équipe ${nextBattle}.`)
                ctx.refresh()
            }),
            control: command("run control <héros> <joueur|bot> : qui joue une unité.", [HERO, CONTROLLER],
                (ctx, chosen, controller) => {
                    const { heroes } = ctx.run
                    heroes.splice(heroes.indexOf(chosen), 1, hero({ ...chosen, controller }))
                    const who = controller === "player" ? "les joueurs" : "un bot"
                    ctx.print(`${chosen.name} est joué par ${who} ${nextBattle}.`)
                    ctx.refresh()
                }),
            restart: command("run restart : recommence une run.", [], ctx => {
                ctx.restart()
                ctx.print("Nouvelle run.")
            }),
        }),
    }
}

/** The commands playing with others. */
function networkCommands(): Readonly<Record<string, Command<MecardContext, unknown>>> {
    return {
        host: command("host <spectate|coop|enemy> [fixed|random] : héberge la partie, et donne son code.",
            [HOST_MODE, optional(SEATING, FIXED_SEATING)], (ctx, mode, seating) => {
                ctx.hostGame(mode.seats, seating.policy(ctx.run))
                ctx.print("Ouverture de la partie...")
            }),
        connect: command("connect <code> <spectate|play> : rejoint une partie hébergée.",
            [ROOM_CODE, INTENT], (ctx, code, intent) => ctx.connect(code, intent.guest)),
    }
}

/** The floor of a run, as the console tells it. */
function floorText(run: Run): string {
    return `${run.travel.floor.type.name} niveau ${run.travel.floor.level}`
}

/** The commands of the journey, between the fights: the map of the floor, its places, the other floors. */
function travelCommands(): Record<string, Command<MecardContext, unknown>> {
    return {
        travel: group("travel", "le voyage : la carte de l'étage et ses lieux, entre les combats.", {
            info: command("travel info : où l'équipe se tient, et où elle peut aller.", [], ctx => {
                const { run } = ctx
                const here = run.travel.place
                    ? `couche ${run.travel.place.layer + 1}, ${infoOf(run.travel.place).name}`
                    : "avant la première couche"
                ctx.print(`${floorText(run)}, profondeur ${run.travel.depth}, ${here}.`)
                printNames(ctx, "Peut aller à", run.travel.next.map(placeWord))
            }),
            map: command("travel map : la carte de l'étage, couche après couche, où l'équipe peut aller.", [], ctx => {
                const { run } = ctx
                run.travel.journey.layers.forEach((layer, index) => {
                    const places = layer.map(place => {
                        const { name } = infoOf(place)
                        return place === run.travel.place ? `[${name}]` : run.travel.next.includes(place) ? `>${name}` : name
                    })
                    ctx.print(`Couche ${index + 1} : ${places.join(", ")}`)
                })
            }),
            goto: command("travel goto <lieu> : va à un lieu où l'équipe peut aller.", [NEXT_PLACE], (ctx, place) => {
                ctx.print(`L'équipe va à ${infoOf(place).name}.`)
                ctx.go(place)
            }),
            places: command("travel places : liste les sortes de lieux.", [], ctx => {
                for(const [kind, info] of Object.entries(PLACE_INFOS) as [PlaceKind, PlaceInfo][]){
                    ctx.print(`${kindWord(kind)} : ${plainText(info.description)}`)
                }
            }),
            visit: command("travel visit <halte> : visite une halte sur place, sans avancer sur la carte.",
                [VISIT], (ctx, kind) => {
                    ctx.print(`L'équipe visite ${PLACE_INFOS[kind].name}.`)
                    ctx.visit(kind)
                }),
            put: command("travel put <halte> <couche> : pose une halte sur la carte, dans la couche, reliée à celles d'avant et d'après.",
                [named("la halte", () => LAYABLE_KINDS, kindWord), whole("la couche", 1)],
                (ctx, kind, layer) => {
                    ctx.run.travel.layHalt(kind, layer - 1)
                    ctx.print(`${PLACE_INFOS[kind].name} posé en couche ${layer}.`)
                    ctx.showMap()
                }),
            jump: command("travel jump <couche> <rang> : pose l'équipe sur un lieu de la carte, sans y entrer.",
                [whole("la couche", 1), whole("le rang", 1)], (ctx, layer, rank) => {
                    const { run } = ctx
                    const places = run.travel.journey.layers.at(layer - 1)
                    if(!places || layer > run.travel.journey.layers.length){
                        throw new Error(`La carte a ${run.travel.journey.layers.length} couches.`)
                    }
                    const place = places.at(rank - 1)
                    if(!place || rank > places.length) throw new Error(`La couche ${layer} a ${places.length} lieux.`)
                    run.travel.jump(place)
                    ctx.print(`L'équipe se tient sur ${infoOf(place).name}, couche ${layer}.`)
                    ctx.showMap()
                }),
            show: command("travel show : revient à la carte, le combat ou la visite en cours abandonnés.", [], ctx => {
                ctx.showMap()
            }),
            floor: command("travel floor <étage> [niveau] : entre dans un étage, au niveau suivant par défaut.",
                [FLOOR, optional(whole("le niveau", 1), null)], (ctx, type, level) => {
                    ctx.run.travel.enterFloor(type.create(level ?? ctx.run.travel.floor.level + 1))
                    ctx.print(`${floorText(ctx.run)}.`)
                    ctx.showMap()
                }),
            reroll: command("travel reroll : refait la carte de l'étage, l'équipe avant sa première couche.", [], ctx => {
                ctx.run.travel.redrawMap()
                ctx.print(`Nouvelle carte : ${floorText(ctx.run)}.`)
                ctx.showMap()
            }),
        }),
    }
}

/** Give a console the commands of the game. */
/** How long a transition tried takes when no duration is typed, in milliseconds. */
const DEFAULT_TRANSITION = 1500

/** The ways a transition is played, as typed. */
const TRANSITION_WAYS = ["endroit", "envers"] as const

/** The commands of the tools of the game, outside the run: `pnj`, `bras`, `catalogue`, `transition`. */
function toolCommands(): Record<string, Command<MecardContext, unknown>> {
    return {
        pnj: command("pnj : ouvre le banc d'essai des PNJ, leurs animations, chapeaux et vêtements.", [], ctx => {
            ctx.showPnj()
        }),
        bras: command("bras : ouvre le banc d'essai du bras des haltes, qui pointe vers la souris.", [], ctx => {
            ctx.showArm()
        }),
        catalogue: command("catalogue : ouvre le catalogue des cartes, cœurs, monstres et autres.", [], ctx => {
            ctx.showLibrary()
        }),
        transition: command(
            "transition <nom> [ms] [endroit|envers] : joue une transition des lieux par-dessus l'écran, en"
                + ` ${DEFAULT_TRANSITION} ms par défaut, et dit quand elle passe son milieu et sa fin.`,
            [
                named("la transition", () => [...PLACE_TRANSITIONS.keys()], name => name),
                optional(whole("la durée en millisecondes", 1), DEFAULT_TRANSITION),
                optional(named("le sens", () => TRANSITION_WAYS, way => way), "endroit"),
            ],
            (ctx, name, duration, way) => {
                const path = PLACE_TRANSITIONS.get(name)
                if(path) ctx.playTransition(path, duration / 1000, way === "envers")
            },
        ),
    }
}

export function registerCommands(console: Console<MecardContext>): void {
    console.register("help", command("help [commande] : liste les commandes, ou détaille l'une d'elles.",
        [optional(named("la commande", () => [...console.commands.keys()], name => name), null)], (ctx, name) => {
            if(!name){
                for(const each of console.commands.values()) ctx.print(each.usage)
                return
            }
            const chosen = console.commands.get(name)
            ctx.print(chosen?.usage ?? name)
            for(const line of chosen?.details ?? []) ctx.print(`  ${line}`)
        }))
    console.register("clear", command("clear : vide la console.", [], () => console.clear()))
    const all = {
        ...catalogCommands(), ...battleCommands(), ...runCommands(), ...travelCommands(), ...toolCommands(),
        ...networkCommands(),
    }
    for(const [name, each] of Object.entries(all)) console.register(name, each)
}
