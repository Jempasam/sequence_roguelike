import type { LayeredImagePath } from "../../../engine/assets"
import type { ClipboardPort } from "../../../platform"
import { command, group, named, optional, whole } from "../../../engine/console"
import { plainText } from "../../../semantic"
import type { Arg, Command, CommandContext, Console } from "../../../engine/console"
import { UnitStats } from "../sim/battle/Unit"
import { Rarity } from "../sim/card/Rarity"
import { ALL_CARDS, ALL_USABLES, ALL_ITEMS } from "../sim/catalog/index"
import { ALL_KITS } from "../sim/catalog/kits"
import { ALL_MONSTERS } from "../sim/catalog/monsters"
import { Heart, insertHeart } from "../sim/heart/Heart"
import { HEART_KINDS } from "../sim/save/catalogNames"
import { deckName } from "../sim/run/deckName"
import { allCards, allyOf, firstDeck, hero, heroOf } from "../sim/run/Hero"
import { ARENA_SCALE, arenaBattle, arenaPoint, dummy, enterBattle, teamOf } from "../sim/run/arena"
import type { Side } from "../sim/run/arena"
import { loadBattle, saveBattle } from "../sim/save/battleSave"
import type { BattleSave } from "../sim/save/battleSave"
import type { Team } from "../sim/battle/Team"
import { ALL_FLOORS } from "../sim/catalog/floors"
import { allHalts, lootHalts } from "../sim/catalog/halts"
import { allPlaceTypes, infoOf } from "../sim/catalog/places"
import { forge, weave } from "../sim/run/visits"
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
import type { Place } from "../sim/run/Journey"
import type { PlaceType } from "../sim/run/PlaceType"
import type { HaltType } from "../sim/halt/HaltType"
import type { FloorType } from "../sim/floor/Floor"
import type { Run } from "../sim/run/Run"
import type { StatusType } from "../sim/status/Status"
import { STATUS_TYPES } from "../sim/status/statusTypes"
import { MINE_HAZARD } from "../sim/hazard/subs/Mine"
import { Rng } from "../sim/base/Rng"
import { COOP_SEATS, ENEMY_SEATS, FIXED_SEATS, randomSeats } from "../sync/run/Seats"
import type { SeatMode, SeatPolicy } from "../sync/run/Seats"

import { chainText, heartsText } from "./describe"
import { placeTransitions } from "./travel/placeLooks"
import { DamageType } from "../sim/battle/DamageType"

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

    /** Fight a battle made apart, in place of the one being fought, or from the map. */
    playBattle(battle: Battle): void

    /** The clipboard of the system, none when it has none. */
    readonly clipboard: ClipboardPort|null

    /** Start a new run, from its first floor. */
    restart(): void

    /** Go to a place the party may go to next: its fight, or its visit. */
    go(place: Place): void

    /** Show the map of the journey, the battle or the visit open left. */
    showMap(): void

    /** Visit a halt where the party stands, without going anywhere. */
    visit(type: HaltType): void

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
    public playBattle(battle: Battle): void { this.host().playBattle(battle) }
    public get clipboard(): ClipboardPort|null { return this.host().clipboard }
    public restart(): void { this.host().restart() }
    public go(place: Place): void { this.host().go(place) }
    public showMap(): void { this.host().showMap() }
    public visit(type: HaltType): void { this.host().visit(type) }
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

/** A status a command puts on a unit: its kind, and the level it takes when none is said. */
interface StatusMaker {
    readonly type: StatusType

    /** What the level stands for, none when the status takes none. */
    readonly amount: string|null
    readonly fallback: number
}

/** The statuses a command puts on a unit: every kind of status, but what lies on the ground, at a level of 2. */
const STATUS_MAKERS: readonly StatusMaker[] = STATUS_TYPES
    .filter(type => type !== MINE_HAZARD)
    .map(type => ({ type, amount: "niveau", fallback: 2 }))

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
const ITEM: Arg<MecardContext, Item> = named("l'objet", () => ALL_ITEMS, item => wordOf(item.name))
const HEART: Arg<MecardContext, HeartKind> = named("le cœur", () => HEART_KINDS, kind => wordOf(kind.name))
const MONSTER: Arg<MecardContext, Monster> = named("le monstre", () => ALL_MONSTERS, monster => wordOf(monster.name))
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
/** The word a sort of place is typed as: its name. */
function typeWord(type: PlaceType): string {
    return wordOf(type.name)
}

const VISIT: Arg<MecardContext, HaltType> = named("la halte", allHalts, typeWord)
const FLOOR: Arg<MecardContext, FloorType> = named("l'étage", () => ALL_FLOORS, type => wordOf(type.name))
const KIT: Arg<MecardContext, Kit> = named("le kit", () => ALL_KITS, kit => wordOf(kit.name))
const USABLE: Arg<MecardContext, Usable> = named("l'utilisable", () => ALL_USABLES, each => wordOf(each.name))

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
                for(const item of ALL_ITEMS) ctx.print(`${wordOf(item.name)} : ${plainText(item.description)}`)
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
                    ctx.battle.applyStatus(unit, maker.type, amount ?? maker.fallback)
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
                for(const monster of ALL_MONSTERS){
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
                if(plan) ctx.print(`Chaîne : ${chainText(plan.view())}.`)
            }),
            heal: command("unit heal <unité> [cœurs] : soigne, d'un cœur par défaut.",
                [UNIT, optional(whole("les cœurs", 1), DEFAULT_HEAL)], (ctx, unit, halves) => {
                    unit.hearts.heal(halves)
                    ctx.print(`${unit.name} : ${heartsText(unit)}.`)
                    ctx.refresh()
                }),
            damage: command("unit damage <unité> <cœurs> : blesse.", [UNIT, whole("les cœurs", 1)],
                (ctx, unit, halves) => {
                    unit.hearts.damage(halves, DamageType.PHYSICAL, null)
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
            arena: command("battle arena : lance une arène vide, avec un mannequin qui revient à chaque round.", [],
                (ctx: MecardContext) => {
                    ctx.playBattle(arenaBattle(ctx.run))
                    ctx.print("Arène : un mannequin de 10 cœurs revient à la fin du round où il tombe.")
                }),
            win: command("battle win : tue les ennemis qui décident de la victoire.", [], (ctx: MecardContext) => {
                endBy(ctx, unit => !isAlly(ctx, unit))
                ctx.print("Les ennemis sont tombés.")
            }),
            lose: command("battle lose : tue les alliés qui décident de la victoire.", [], (ctx: MecardContext) => {
                endBy(ctx, unit => isAlly(ctx, unit))
                ctx.print("Les alliés sont tombés.")
            }),
            save: command("battle save : copie le combat dans le presse-papier.", [], (ctx: MecardContext) => {
                saveToClipboard(ctx)
            }),
            load: command("battle load : charge le combat du presse-papier, en lançant le combat au besoin.", [],
                (ctx: MecardContext) => {
                    loadFromClipboard(ctx)
                }),
            create: command(
                "battle create <x> <y> [monstre|kit] [ally|enemy] [controlled|bot] : crée une unité (x et y de 0 à 100), un mannequin sans cible.",
                [PERCENT, PERCENT, optional(FIGHTER, null), optional(SIDE, null), optional(CONTROL, null)],
                (ctx, x, y, fighter, side, control) => {
                    createUnit(ctx, x, y, fighter, side ?? "enemy", control)
                }),
            edit: onUnit(
                "battle edit <unité> <damage|remove|item|usable|heart|card|status|process> ... : modifie une unité.",
                [
                    "battle edit <unité> damage <cœurs> : blesse.",
                    "battle edit <unité> remove : retire l'unité du combat.",
                    "battle edit <unité> item <add|remove|clear|list> [objet] [nombre]",
                    "battle edit <unité> usable <add|remove|clear|list> [utilisable] [nombre]",
                    "battle edit <unité> heart <add|remove|clear|list> [cœur] [nombre]",
                    "battle edit <unité> card <add|remove|clear|list> [carte] [nombre] : la main.",
                    "battle edit <unité> status <add|remove|clear|list> [statut] [niveau]",
                    "battle edit <unité> process <list|clear>",
                ],
                unitEdits,
            ),
            reset: command("battle reset : refait le combat de ce lieu, avec de nouveaux monstres.", [], ctx => {
                ctx.newBattle()
                ctx.print(`Nouveau combat, ${floorText(ctx.run)}.`)
            }),
        }),
    }
}


//// The battle commands: ending it, saving it, creating and editing units ////

/** Is the unit on the side of the heroes? Read by the name of the team: a battle loaded has its own teams. */
function isAlly(ctx: MecardContext, unit: Unit): boolean {
    return unit.team.name === ctx.run.heroesTeam.name
}

/** The team of a side in the battle: the one it holds under the name of the side, else the one of the run. */
function sideTeam(ctx: MecardContext, side: Side): Team {
    const team = teamOf(ctx.run, side)
    return ctx.battle.teams.find(each => each.name === team.name) ?? team
}

/** End the battle by killing the units that decide the victory and fit: an arena ends no more by itself. */
function endBy(ctx: MecardContext, fits: (unit: Unit) => boolean): void {
    ctx.battle.endless = false
    for(const unit of ctx.battle.living){
        if(unit.decisive && fits(unit)) unit.hearts.slay(null)
    }
    ctx.refresh()
}

/** Copy the battle into the clipboard, saying why when it cannot. */
function saveToClipboard(ctx: MecardContext): void {
    const { clipboard } = ctx
    if(!clipboard){
        ctx.print("Pas de presse-papier ici.")
        return
    }
    let text: string
    try {
        text = JSON.stringify(saveBattle(ctx.battle))
    } catch(error){
        const why = error instanceof Error ? error.message : String(error)
        ctx.print(`Le combat ne peut pas être copié (${why}). Attends la préparation du round ou la fin du combat.`)
        return
    }
    clipboard.write(text).then(
        () => ctx.print(`Combat copié dans le presse-papier (${text.length} caractères).`),
        (error: unknown) => ctx.print(`Le presse-papier a refusé la copie : ${String(error)}`),
    )
}

/** Fight the battle the clipboard holds, in place of the one fought, or from the map. */
function loadFromClipboard(ctx: MecardContext): void {
    const { clipboard } = ctx
    if(!clipboard){
        ctx.print("Pas de presse-papier ici.")
        return
    }
    clipboard.read().then(text => {
        let battle: Battle
        try {
            battle = loadBattle(JSON.parse(text) as BattleSave)
        } catch(error){
            const why = error instanceof Error ? error.message : String(error)
            ctx.print(`Le presse-papier ne tient pas un combat lisible (${why}). Copie-le avec battle save.`)
            return
        }
        ctx.playBattle(battle)
        ctx.print("Combat chargé.")
    }, (error: unknown) => ctx.print(`Le presse-papier a refusé la lecture : ${String(error)}`))
}

/** What a unit is created from: a kind of monster or a kit, by the word it is typed with. */
interface Fighter {
    readonly word: string
    readonly character: () => Hero
}

/** Every kind of monster then every kit, a kit whose name a monster has left out. */
function fighters(): Fighter[] {
    const monsters = ALL_MONSTERS.map(monster => ({
        word: wordOf(monster.name), character: () => allyOf(monster, monster.name),
    }))
    const taken = new Set(monsters.map(each => each.word.toLowerCase()))
    const kits = ALL_KITS.map(kit => ({ word: wordOf(kit.name), character: () => heroOf(kit) }))
    return [...monsters, ...kits.filter(each => !taken.has(each.word.toLowerCase()))]
}

const FIGHTER: Arg<MecardContext, Fighter> = named("le monstre ou le kit", fighters, each => each.word)
const SIDE: Arg<MecardContext, Side> = named("le camp", () => ["ally", "enemy"] as const, side => side)
const CONTROL: Arg<MecardContext, Controller> = {
    complete: () => ["controlled", "bot"],
    read: (_, word) => {
        const lower = word?.toLowerCase()
        if(lower === "controlled") return "player"
        if(lower === "bot") return "bot"
        return new Error("Le contrôle : controlled ou bot.")
    },
}

/** A place along a wall of the arena, from 0 to 100. */
const PERCENT: Arg<MecardContext, number> = {
    complete: () => [],
    read: (_, word) => {
        const value = Number(word)
        if(word === undefined || !Number.isInteger(value) || value < 0 || value > ARENA_SCALE){
            return new Error(`La position : un nombre entier de 0 à ${ARENA_SCALE}.`)
        }
        return value
    },
}

/** Bring a unit in: a dummy when no kind is told, an ally controlled by the players, a foe by a bot. */
function createUnit(
    ctx: MecardContext, x: number, y: number, fighter: Fighter|null, side: Side, control: Controller|null,
): void {
    const { battle } = ctx
    if(battle.phase === "execution" || battle.phase === "over"){
        ctx.print(`Pas de nouvelle unité pendant la phase ${battle.phase} : attends le round suivant.`)
        return
    }
    const character = fighter ? fighter.character() : dummy()
    const controller = control ?? (side === "ally" && fighter ? "player" : "bot")
    const unit = enterBattle(battle, character, sideTeam(ctx, side), arenaPoint(x, y), side, controller)
    ctx.print(`${unit.name} créé (${side === "ally" ? "allié" : "ennemi"}, ${controller === "player" ? "joueur" : "bot"}).`)
    ctx.refresh()
}

/** A command typed after a unit, its other words read by what `edits` makes of that unit. */
function onUnit(
    usage: string, details: readonly string[], edits: (unit: Unit) => Command<MecardContext, unknown>,
): Command<MecardContext, { readonly edit: Command<MecardContext, unknown>, readonly parsed: unknown }> {
    return {
        usage, details,
        complete: (ctx, args) => {
            if(args.length <= 1) return UNIT.complete(ctx, [])
            const unit = UNIT.read(ctx, args[0], [])
            return unit instanceof Error ? [] : edits(unit).complete(ctx, args.slice(1))
        },
        parse: (ctx, args) => {
            const unit = UNIT.read(ctx, args[0], [])
            if(unit instanceof Error) return unit
            const edit = edits(unit)
            const parsed = edit.parse(ctx, args.slice(1))
            return parsed instanceof Error ? parsed : { edit, parsed }
        },
        execute: (ctx, { edit, parsed }) => edit.execute(ctx, parsed),
    }
}

/** How many of something a command acts on, one when it is not said. */
const COUNT = optional(whole<MecardContext>("le nombre", 1), 1)

/** Do something count times. */
function times(count: number, act: () => void): void {
    for(let i = 0; i < count; i++) act()
}

/** The edits of one unit: what `battle edit <unit>` runs. */
function unitEdits(unit: Unit): Command<MecardContext, unknown> {
    const itemsHeld = named<MecardContext, Item>("l'objet", () => unit.items, item => wordOf(item.name))
    const usablesHeld = named<MecardContext, Carried>("l'utilisable", () => unit.usables, each => wordOf(each.usable.name))
    const heartsHeld = named<MecardContext, HeartKind>("le cœur",
        () => [...new Set(unit.hearts.all.map(heart => heart.kind))], kind => wordOf(kind.name))
    const cardsHeld = named<MecardContext, Card>("la carte", () => [...new Set(unit.hand)], card => wordOf(card.name))
    const statusesHeld = named<MecardContext, StatusType>("le statut", () => [...unit.statuses.keys()],
        type => wordOf(type.name))
    const done = (ctx: MecardContext, text: string): void => {
        ctx.print(`${unit.name} : ${text}`)
        ctx.refresh()
    }
    return group(`battle edit ${wordOf(unit.name)}`, "modifie une unité.", {
        damage: command("damage <cœurs> : blesse.", [whole<MecardContext>("les cœurs", 1)], (ctx, halves) => {
            unit.hearts.damage(halves, DamageType.PHYSICAL, null)
            done(ctx, heartsText(unit))
        }),
        remove: command("remove : retire l'unité du combat.", [], (ctx: MecardContext) => {
            ctx.battle.vanish(unit)
            ctx.print(`${unit.name} est retiré du combat.`)
            ctx.refresh()
        }),
        item: group("item", "les objets de l'unité.", {
            add: command("add <objet> [nombre] : équipe.", [ITEM, COUNT], (ctx, item, count) => {
                times(count, () => ctx.battle.equip(unit, item))
                done(ctx, `${count} × ${item.name} équipé.`)
            }),
            remove: command("remove <objet> [nombre] : déséquipe.", [itemsHeld, COUNT], (ctx, item, count) => {
                const before = unit.items.length
                times(count, () => ctx.battle.unequip(unit, item))
                done(ctx, `${before - unit.items.length} × ${item.name} retiré.`)
            }),
            clear: command("clear : déséquipe tout.", [], (ctx: MecardContext) => {
                for(const item of [...unit.items]) ctx.battle.unequip(unit, item)
                done(ctx, "plus d'objet.")
            }),
            list: command("list : liste les objets.", [], (ctx: MecardContext) => {
                printNames(ctx, unit.name, unit.items.map(item => item.name))
            }),
        }),
        usable: group("usable", "les utilisables de l'unité.", {
            add: command("add <utilisable> [nombre] : en donne.", [USABLE, COUNT], (ctx, usable, count) => {
                times(count, () => unit.usables.push(new Carried(usable)))
                done(ctx, `${count} × ${usable.name} donné.`)
            }),
            remove: command("remove <utilisable> [nombre] : en retire.", [usablesHeld, COUNT],
                (ctx, carried, count) => {
                    let removed = 0
                    times(count, () => {
                        const at = unit.usables.findIndex(each => each.usable === carried.usable)
                        if(at >= 0){
                            unit.usables.splice(at, 1)
                            removed++
                        }
                    })
                    done(ctx, `${removed} × ${carried.usable.name} retiré.`)
                }),
            clear: command("clear : retire tout.", [], (ctx: MecardContext) => {
                unit.usables.length = 0
                done(ctx, "plus d'utilisable.")
            }),
            list: command("list : liste les utilisables.", [], (ctx: MecardContext) => {
                printNames(ctx, unit.name, unit.usables.map(String))
            }),
        }),
        heart: group("heart", "les cœurs de l'unité.", {
            add: command("add <cœur> [nombre] : en donne, pleins.", [HEART, COUNT], (ctx, kind, count) => {
                times(count, () => unit.hearts.give(new Heart(kind)))
                done(ctx, heartList(unit.hearts.all))
            }),
            remove: command("remove <cœur> [nombre] : en retire, les pleins d'abord depuis la fin.",
                [heartsHeld, COUNT], (ctx, kind, count) => {
                    unit.hearts.remove(kind, count, null)
                    done(ctx, heartList(unit.hearts.all))
                }),
            clear: command("clear : retire tous les cœurs pleins.", [], (ctx: MecardContext) => {
                for(const kind of new Set(unit.hearts.all.map(heart => heart.kind))){
                    unit.hearts.remove(kind, unit.hearts.all.length, null)
                }
                done(ctx, heartList(unit.hearts.all))
            }),
            list: command("list : liste les cœurs.", [], (ctx: MecardContext) => {
                ctx.print(`${unit.name} : ${heartList(unit.hearts.all)}.`)
            }),
        }),
        card: group("card", "la main de l'unité.", {
            add: command("add <carte> [nombre] : met dans la main.", [CARD, COUNT], (ctx, card, count) => {
                times(count, () => unit.hand.push(card))
                done(ctx, `${count} × ${card.name} dans la main.`)
            }),
            remove: command("remove <carte> [nombre] : retire de la main.", [cardsHeld, COUNT],
                (ctx, card, count) => {
                    let removed = 0
                    times(count, () => {
                        if(takeOut(unit.hand, card)) removed++
                    })
                    ctx.handChanged(unit)
                    done(ctx, `${removed} × ${card.name} retirée.`)
                }),
            clear: command("clear : vide la main.", [], (ctx: MecardContext) => {
                unit.hand.length = 0
                ctx.handChanged(unit)
                done(ctx, "main vide.")
            }),
            list: command("list : liste la main.", [], (ctx: MecardContext) => {
                printNames(ctx, unit.name, countedNames(unit.hand))
            }),
        }),
        status: group("status", "les statuts de l'unité.", {
            add: command("add <statut> [niveau] : met un statut.",
                [STATUS, optional(whole<MecardContext>("le niveau", 1), null)], (ctx, maker, amount) => {
                    ctx.battle.applyStatus(unit, maker.type, amount ?? maker.fallback)
                    done(ctx, unit.statusOf(maker.type)?.toString() ?? "rien")
                }),
            remove: command("remove <statut> : retire un statut.", [statusesHeld], (ctx, type) => {
                ctx.battle.removeStatus(unit, type)
                done(ctx, `plus ${type.name}.`)
            }),
            clear: command("clear : retire tous les statuts.", [], (ctx: MecardContext) => {
                for(const type of [...unit.statuses.keys()]) ctx.battle.removeStatus(unit, type)
                done(ctx, "plus de statut.")
            }),
            list: command("list : liste les statuts.", [], (ctx: MecardContext) => {
                printNames(ctx, unit.name, [...unit.statuses.values()].map(String))
            }),
        }),
        process: group("process", "les processus de l'unité.", {
            list: command("list : liste les processus en cours.", [], (ctx: MecardContext) => {
                printNames(ctx, unit.name, unit.processes.map(String))
            }),
            clear: command("clear : met fin aux processus.", [], (ctx: MecardContext) => {
                ctx.battle.endProcesses(unit)
                done(ctx, "plus de processus.")
            }),
        }),
    })
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
                for(const type of allPlaceTypes()){
                    ctx.print(`${typeWord(type)} : ${plainText(type.description)}`)
                }
            }),
            visit: command("travel visit <halte> : visite une halte sur place, sans avancer sur la carte.",
                [VISIT], (ctx, type) => {
                    ctx.print(`L'équipe visite ${type.name}.`)
                    ctx.visit(type)
                }),
            put: command("travel put <halte> <couche> : pose une halte sur la carte, dans la couche, reliée à celles d'avant et d'après.",
                [named("la halte", lootHalts, typeWord), whole("la couche", 1)],
                (ctx, type, layer) => {
                    ctx.run.travel.layHalt(type, layer - 1)
                    ctx.print(`${type.name} posé en couche ${layer}.`)
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
        noreload: command("noreload : désactive le hot reload de vite.", [], _ => {
            try{
                if ((import.meta as any).hot) {
                    (import.meta as any).hot.on('vite:beforeFullReload', () => {
                        throw '(skipping full reload)';
                    });
                }
            }catch(_){}
        }),
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
                named("la transition", () => [...placeTransitions().keys()], name => name),
                optional(whole("la durée en millisecondes", 1), DEFAULT_TRANSITION),
                optional(named("le sens", () => TRANSITION_WAYS, way => way), "endroit"),
            ],
            (ctx, name, duration, way) => {
                const path = placeTransitions().get(name)
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
