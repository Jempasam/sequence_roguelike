import { describe, expect, test } from "vitest"
import { Console } from "@game/core"
import { BURN, CardChain, FORGE_HALT, Run, STEP, THRUST, WHETSTONE } from "@game/core/mecard"
import type { Battle, HaltType, Unit } from "@game/core/mecard"
import { LiveContext, registerCommands } from "@game/core/mecard/commands"
import type { MecardContext } from "@game/core/mecard/commands"
import { COOP_SEATS, ENEMY_SEATS, FIXED_SEATS } from "@game/core/mecard/sync"
import type { SeatMode, SeatPolicy } from "@game/core/mecard/sync"
import { startedRun } from "../../../fixtures/startedRun"

// --- Fixture builders ---

/** What a test plays with: the console, the run, the battle of the moment, the units whose hand changed. */
interface Game {
    readonly console: Console<MecardContext>
    readonly run: Run
    battle(): Battle
    readonly changed: Unit[]

    /** The sorts of halt visited on the spot, in order. */
    readonly visited: HaltType[]

    /** The transitions played, in order: their painting, duration in seconds, and whether in reverse. */
    readonly transitions: (readonly [string, number, boolean])[]

    /** What the game was hosted with, in order. */
    readonly hostings: (readonly [SeatMode|null, SeatPolicy])[]

    /** The games connected to, in order: their code, and whether to play. */
    readonly connections: (readonly [string, boolean])[]
}

/** A console over a run, its first battle started. */
function game(): Game {
    const run = startedRun(3)
    let battle = run.newBattle()
    const changed: Unit[] = []
    const visited: HaltType[] = []
    const transitions: (readonly [string, number, boolean])[] = []
    const hostings: (readonly [SeatMode|null, SeatPolicy])[] = []
    const connections: (readonly [string, boolean])[] = []
    const board = { text: "" }
    const made: Console<MecardContext> = new Console<MecardContext>(new LiveContext(() => ({
        run, battle,
        print: text => made.print(text),
        refresh: () => {},
        handChanged: unit => changed.push(unit),
        newBattle: () => { battle = run.newBattle() },
        playBattle: played => { battle = played },
        clipboard: {
            read: () => Promise.resolve(board.text),
            write: text => {
                board.text = text
                return Promise.resolve()
            },
        },
        restart: () => {},
        go: place => run.travel.go(place),
        showMap: () => {},
        visit: kind => visited.push(kind),
        showPnj: () => {},
        showArm: () => {},
        showLibrary: () => {},
        playTransition: (path, duration, reverse) => transitions.push([path, duration, reverse]),
        hostGame: (mode, policy) => hostings.push([mode, policy]),
        connect: (code, guest) => connections.push([code, guest]),
    })))
    registerCommands(made)
    return {
        console: made, run, battle: () => battle, changed, visited, transitions, hostings, connections, board,
    }
}

/** The unit of the first hero. */
function lancer(battle: Battle): Unit {
    const unit = battle.units.find(each => each.name === "Lancier")
    if(!unit) throw new Error("No Lancier in the battle.")
    return unit
}

/** The errors the console printed. */
function errors(console: Console<MecardContext>): string[] {
    return console.lines.filter(line => line.kind === "error").map(line => line.text)
}

/** How many copies of a card cards hold. */
function copies(cards: readonly unknown[], card: unknown): number {
    return cards.filter(each => each === card).length
}

// --- Tests ---

describe("Mecard commands", () => {
    test("help → a line for each command, no error", () => {
        const { console } = game()
        console.submit("help")
        expect(console.lines.filter(line => line.kind === "error")).toEqual([])
        expect(console.lines.length).toBe(console.commands.size + 1)
    })

    test("help of a group → its sub-commands", () => {
        const { console } = game()
        console.submit("help hand")
        expect(console.lines.some(line => line.text.includes("hand draw"))).toBe(true)
    })

    test("hand add then hand remove → the card in hand then out, the chain planned again", () => {
        const { console, battle, changed } = game()
        const unit = lancer(battle())
        const before = copies(unit.hand, THRUST)
        console.submit("hand add Lancier Estoc")
        expect(copies(unit.hand, THRUST)).toBe(before + 1)
        console.submit("hand remove Lancier Estoc")
        expect(copies(unit.hand, THRUST)).toBe(before)
        expect(changed).toEqual([unit])
    })

    test("hand remove, completed → the cards of that hand only, each once", () => {
        const { console, battle } = game()
        const unit = lancer(battle())
        expect(console.suggestions("hand remove Lancier ")).toHaveLength(new Set(unit.hand).size)
    })

    test("hand discard with no card → the whole hand in the discard", () => {
        const { console, battle } = game()
        const unit = lancer(battle())
        const count = unit.hand.length
        console.submit("hand discard Lancier")
        expect(unit.hand).toEqual([])
        expect(unit.decks.all[0].discard).toHaveLength(count)
    })

    test("hand draw 2 → two cards from the pile", () => {
        const { console, battle } = game()
        const unit = lancer(battle())
        const [hand, pile] = [unit.hand.length, unit.decks.all[0].pile.length]
        console.submit("hand draw Lancier 2")
        expect(unit.hand).toHaveLength(hand + 2)
        expect(unit.decks.all[0].pile).toHaveLength(pile - 2)
    })

    test("deck add → the card drawn next", () => {
        const { console, battle } = game()
        const unit = lancer(battle())
        console.submit("deck add Lancier Avancer")
        expect(unit.decks.all[0].pile.at(-1)).toBe(STEP)
    })

    test("deck recycle → the discard back in the pile", () => {
        const { console, battle } = game()
        const unit = lancer(battle())
        console.submit("hand discard Lancier")
        const total = unit.decks.all[0].pile.length + unit.decks.all[0].discard.length
        console.submit("deck recycle Lancier")
        expect(unit.decks.all[0].discard).toEqual([])
        expect(unit.decks.all[0].pile).toHaveLength(total)
    })

    test("attr set → the base changed, a yes or no for a flag", () => {
        const { console, battle } = game()
        const unit = lancer(battle())
        console.submit("attr set Lancier chainSize 6")
        console.submit("attr set Lancier ordered oui")
        expect(unit.stats.chainSize.base).toBe(6)
        expect(unit.stats.ordered.base).toBe(true)
        expect(console.check("attr set Lancier ordered 3").valid).toBe(false)
    })

    test("item give → the item plugged in at once", () => {
        const { console, battle } = game()
        const unit = lancer(battle())
        const strengthBefore = unit.stats.strength.value
        console.submit("item give Lancier Pierre_à_aiguiser")
        expect(unit.items).toContain(WHETSTONE)
        expect(unit.stats.strength.value).toBe(strengthBefore + 1)
    })

    test("status add then remove → the status on, then off", () => {
        const { console, battle } = game()
        const unit = lancer(battle())
        console.submit("status add Lancier brûlure 3")
        expect(unit.statusOf(BURN)?.toString()).toBe("brûlure 3 rounds")
        console.submit("status remove Lancier brûlure")
        expect(unit.statusOf(BURN)).toBeUndefined()
    })

    test("run addcard, then battle reset → the new battle has the card", () => {
        const { console, run, battle } = game()
        const cards = run.heroes[0].decks[0].length
        console.submit("run addcard Lancier Estoc")
        console.submit("battle reset")
        const unit = lancer(battle())
        expect(unit.hand.length + unit.decks.all[0].pile.length).toBe(cards + 1)
    })

    test("each list and info → printed, no error", () => {
        const { console } = game()
        const lines = [
            "card list", "card list rare", "card info Estoc", "item list", "status list", "heart list",
            "monster list", "monster info Gobelin", "process list", "unit list", "unit info Lancier", "attr list Lancier",
            "hand list", "deck list Lancier", "battle info", "run info", "run hero Épéiste", "travel info",
            "travel places",
        ]
        for(const line of lines) console.submit(line)
        expect(console.lines.filter(line => line.kind === "error")).toEqual([])
    })

    test("travel goto a place of the first layer → the party there", () => {
        const { console, run } = game()
        const [word] = console.suggestions("travel goto ")
        console.submit(`travel goto ${word}`)
        expect(console.lines.filter(line => line.kind === "error")).toEqual([])
        expect(run.travel.place).toBe(run.travel.journey.layers[0][0])
    })

    test("run gold 99 → 99 gold", () => {
        const { console, run } = game()
        console.submit("run gold 99")
        expect(run.gold).toBe(99)
    })

    test("run fuse two cards of a hero → one fusion in their place", () => {
        const { console, run } = game()
        const hero = run.heroes[0]
        const cards = hero.decks[0].length
        console.submit("run fuse Lancier Estoc Viser")
        expect(hero.decks[0]).toHaveLength(cards - 1)
        expect(hero.decks[0].at(-1)?.name).toBe("Estoc + Viser")
    })

    test("travel map → a line for each layer, no error", () => {
        const { console } = game()
        console.submit("travel map")
        expect(console.lines.filter(line => line.kind === "error")).toEqual([])
        expect(console.lines.filter(line => line.text.startsWith("Couche"))).toHaveLength(13)
    })

    test("transition → the one named played, forward by default, for the duration and the way typed", () => {
        const { console, transitions } = game()
        for(const line of ["transition door", "transition Door 400", "transition door 2000 envers"]){
            console.submit(line)
        }
        expect(console.lines.filter(line => line.kind === "error")).toEqual([])
        const door = "mecard/transitions/door.ora"
        expect(transitions).toEqual([[door, 1.5, false], [door, 0.4, false], [door, 2, true]])
    })

    test("transition unnamed, unknown, of a duration of 0 or an unknown way → refused, nothing played", () => {
        const { console, transitions } = game()
        for(const line of ["transition", "transition fenêtre", "transition door 0", "transition door 500 côté"]){
            console.submit(line)
        }
        expect(errors(console)).toHaveLength(4)
        expect(transitions).toEqual([])
    })

    test("travel visit → the place visited where the party stands, fights not offered", () => {
        const { console, run, visited } = game()
        console.submit("travel visit Forge")
        expect(visited).toEqual([FORGE_HALT])
        expect(run.travel.place).toBeNull()
        expect(console.check("travel visit Combat").valid).toBe(false)
    })

    test("travel jump → the party on that place, its next places offered; out of the map → an error", () => {
        const { console, run } = game()
        console.submit("travel jump 3 1")
        expect(run.travel.place).toBe(run.travel.journey.layers[2][0])
        expect(run.travel.next).toBe(run.travel.journey.layers[2][0].next)
        console.submit("travel jump 99 1")
        expect(errors(console)).toHaveLength(1)
    })

    test("travel put → a halt in that layer, led to by the layer before and leading to the one after; out of the map → an error", () => {
        const { console, run } = game()
        const { journey } = run.travel
        const before = journey.layers[2].length
        console.submit("travel put Forge 3")
        const halt = journey.layers[2].find(place => place.type === FORGE_HALT)
        expect(journey.layers[2]).toHaveLength(before + 1)
        expect(journey.layers[1].every(place => place.next.includes(halt!))).toBe(true)
        expect(halt?.next).toEqual(journey.layers[3])
        console.submit("travel put Forge 99")
        console.submit("travel put Sortie 1")
        expect(errors(console)).toHaveLength(2)
    })

    test("travel floor → that floor, before its first layer; travel reroll → a new map", () => {
        const { console, run } = game()
        console.submit("travel jump 2 1")
        console.submit("travel floor Mine")
        expect(run.travel.floor.type.name).toBe("Mine")
        expect(run.travel.floor.level).toBe(2)
        expect(run.travel.place).toBeNull()
        console.submit("travel floor Enfer 7")
        expect(run.travel.floor.level).toBe(7)
        const journey = run.travel.journey
        console.submit("travel reroll")
        expect(run.travel.journey).not.toBe(journey)
    })

    test("run hire, tame, merge, fire → the party changed", () => {
        const { console, run } = game()
        console.submit("run hire Archère")
        console.submit("run tame Gobelin")
        expect(run.heroes.map(hero => hero.name)).toEqual(["Lancier", "Épéiste", "Archère", "Gobelin allié"])
        expect(run.heroes[3].controller).toBe("bot")
        console.submit("run merge Lancier Épéiste")
        console.submit("run fire Archère")
        expect(run.heroes.map(hero => hero.name)).toEqual(["Lancier-Épéiste", "Gobelin allié"])
        expect(console.check("run merge Gobelin_allié Gobelin_allié").valid).toBe(false)
        expect(errors(console)).toEqual([])
    })

    test("run fire the last of the party → an error, the party kept", () => {
        const { console, run } = game()
        console.submit("run fire Lancier")
        console.submit("run fire Épéiste")
        expect(run.heroes.map(hero => hero.name)).toEqual(["Épéiste"])
        expect(errors(console)).toHaveLength(1)
    })

    test("run control bot, then run usable and unusable → a bot hero carrying, then not", () => {
        const { console, run } = game()
        console.submit("run control Lancier bot")
        expect(run.heroes[0].controller).toBe("bot")
        console.submit("run usable Lancier Potion_de_soin")
        expect(run.heroes[0].usables.map(each => each.usable.name)).toEqual(["Bouteille d'estoc", "Potion de soin"])
        console.submit("run unusable Lancier Potion_de_soin")
        expect(run.heroes[0].usables.map(each => each.usable.name)).toEqual(["Bouteille d'estoc"])
        expect(errors(console)).toEqual([])
    })

    test("host spectate → hosted with nothing to give, the first free by default", () => {
        const { console, hostings } = game()
        console.submit("host spectate")
        expect(hostings).toEqual([[null, FIXED_SEATS]])
        expect(errors(console)).toEqual([])
    })

    test("host coop fixed, host enemy random → their modes, the second drawing", () => {
        const { console, hostings } = game()
        console.submit("host coop fixed")
        console.submit("host enemy random")
        expect(hostings[0]).toEqual([COOP_SEATS, FIXED_SEATS])
        expect(hostings[1][0]).toBe(ENEMY_SEATS)
        expect(hostings[1][1]).not.toBe(FIXED_SEATS)
    })

    test("host with an unknown mode → an error, nothing hosted", () => {
        const { console, hostings } = game()
        console.submit("host duel")
        expect(hostings).toEqual([])
        expect(errors(console)).toHaveLength(1)
    })

    test("connect → the code, and whether the player comes to play", () => {
        const { console, connections } = game()
        console.submit("connect K7QX2M spectate")
        console.submit("connect K7QX2M play")
        expect(connections).toEqual([["K7QX2M", false], ["K7QX2M", true]])
    })

    test("connect without saying why → an error, nothing connected", () => {
        const { console, connections } = game()
        console.submit("connect K7QX2M")
        expect(connections).toEqual([])
        expect(errors(console)).toHaveLength(1)
    })
})

describe("Mecard battle commands", () => {
    /** The first living unit named after a word. */
    const named = (battle: Battle, word: string): Unit => {
        const unit = battle.living.find(each => each.name.startsWith(word))
        if(!unit) throw new Error(`No ${word} in the battle.`)
        return unit
    }

    test("battle arena → the party and a dummy of ten hearts, an endless battle", () => {
        const { console, battle, run } = game()
        console.submit("battle arena")
        expect(errors(console)).toEqual([])
        expect(battle().endless).toBe(true)
        expect(battle().living.filter(unit => unit.team === run.heroesTeam)).toHaveLength(run.heroes.length)
        expect(named(battle(), "Mannequin").life).toBe(10)
    })

    test("a dummy killed in an arena → the battle goes on, a dummy back at the end of the round", () => {
        const { console, battle } = game()
        console.submit("battle arena")
        const arena = battle()
        const first = named(arena, "Mannequin")
        first.hearts.slay(null)
        arena.startRound()
        for(const unit of arena.initiative) arena.commit(unit, CardChain.leftToRight([], 0))
        arena.endPreparation()
        arena.playRound()
        expect(arena.phase).not.toBe("over")
        expect(first.alive).toBe(false)
        expect(named(arena, "Mannequin")).not.toBe(first)
    })

    test("battle win, then lose → the battle ends for good, on the right side", () => {
        const { console, battle, run } = game()
        console.submit("battle arena")
        console.submit("battle win")
        expect(battle().endless).toBe(false)
        expect(battle().living.some(unit => unit.team !== run.heroesTeam)).toBe(false)
        const other = game()
        other.console.submit("battle lose")
        const ours = other.run.heroesTeam
        expect(other.battle().living.some(unit => unit.team === ours && unit.decisive)).toBe(false)
    })

    test("battle create → a dummy, an ally controlled by the players, a foe a bot", () => {
        const { console, battle, run } = game()
        console.submit("battle create 50 50")
        const dummyUnit = named(battle(), "Mannequin")
        expect(dummyUnit.controller).toBe("bot")
        console.submit("battle create 10 90 Gobelin ally")
        const ally = battle().living.find(unit => unit.name.startsWith("Gobelin") && unit.team === run.heroesTeam)
        expect(ally?.controller).toBe("player")
        console.submit("battle create 10 10 Gobelin enemy bot")
        expect(errors(console)).toEqual([])
        console.submit("battle create 101 10")
        expect(errors(console)).toHaveLength(1)
    })

    test("battle edit → damage, hearts, items, cards, statuses of one unit", () => {
        const { console, battle } = game()
        const unit = lancer(battle())
        const life = unit.life
        console.submit("battle edit Lancier damage 1")
        expect(unit.life).toBe(life - 1)
        const hand = copies(unit.hand, THRUST)
        console.submit("battle edit Lancier card add Estoc 3")
        expect(copies(unit.hand, THRUST)).toBe(hand + 3)
        console.submit("battle edit Lancier card remove Estoc 2")
        expect(copies(unit.hand, THRUST)).toBe(hand + 1)
        console.submit("battle edit Lancier card clear")
        expect(unit.hand.length).toBe(0)
        console.submit("battle edit Lancier item clear")
        expect(unit.items.length).toBe(0)
        console.submit("battle edit Lancier item add Pierre_à_aiguiser 2")
        console.submit("battle edit Lancier status add Brûlure")
        console.submit("battle edit Lancier status clear")
        expect(unit.statuses.size).toBe(0)
        const hearts = unit.hearts.all.length
        console.submit("battle edit Lancier heart add rouge 2")
        expect(unit.hearts.all.length).toBe(hearts + 2)
        console.submit("battle edit Lancier heart remove rouge 1")
        expect(errors(console)).toEqual([])
        console.submit("battle edit Lancier remove")
        expect(battle().units.includes(unit)).toBe(false)
    })

    test("battle edit heart clear → the unit dies, and no edit finds it afterwards", () => {
        const { console, battle } = game()
        const unit = lancer(battle())
        console.submit("battle edit Lancier heart clear")
        expect(unit.alive).toBe(false)
        console.submit("battle edit Lancier remove")
        expect(errors(console)).toHaveLength(1)
    })

    test("battle save then load → the same battle again, from the clipboard", async() => {
        const { console, battle, board } = game()
        const before = battle().living.length
        console.submit("battle save")
        await new Promise(resolve => setTimeout(resolve))
        expect(JSON.parse(board.text)).toHaveProperty("units")
        console.submit("battle edit Lancier remove")
        console.submit("battle load")
        await new Promise(resolve => setTimeout(resolve))
        expect(errors(console)).toEqual([])
        expect(battle().living).toHaveLength(before)
    })

    test("battle load of nothing readable → an error line, the battle left alone", async() => {
        const { console, battle, board } = game()
        const kept = battle()
        board.text = "pas du json"
        console.submit("battle load")
        await new Promise(resolve => setTimeout(resolve))
        expect(battle()).toBe(kept)
        expect(console.lines.some(line => line.text.includes("presse-papier"))).toBe(true)
    })
})
