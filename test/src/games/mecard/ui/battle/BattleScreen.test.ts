import { describe, expect, test } from "vitest"
import { CardChain, Run } from "@game/core/mecard"
import type { Battle, Unit } from "@game/core/mecard"
import { ALL_BATTLE_LOCKS, BattleScreen, NO_BATTLE_LOCKS } from "@game/core/mecard/battle-screen"
import type { BattleLocks, BattleScreenOptions } from "@game/core/mecard/battle-screen"
import type { Painter } from "@game/core"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import { settled } from "./replay"

// --- Fixture builders ---

/** Units with no pictures. */
const NO_SPRITES = {
    of: () => null,
    cardBack: () => null,
    whenLoaded: () => {},
} as unknown as BattleScreenOptions["sprites"]

/** A world nothing is looked at in. */
const NO_WORLD = new Proxy({}, { get: () => () => {} }) as unknown as Painter

/** A screen on the first fight of a run, its battles over told. */
function shown(locks: BattleLocks = NO_BATTLE_LOCKS) {
    const setup = uiSetup({}, 620, 348)
    const battle = new Run(3).newBattle()
    const over: Battle[] = []
    let readies = 0
    const screen = new BattleScreen(setup.ui, battle, {
        theme: setup.theme, sprites: NO_SPRITES, locks,
        toWorld: (x, y) => [x, y], toUi: (x, y) => [x, y],
        depth: () => 1,
        over: done => over.push(done),
        ready: () => readies++,
        report: text => {
            throw new Error(text)
        },
    })
    return { setup, battle, screen, over, readies: () => readies }
}

/** Show everything told, until nothing plays anymore. */
async function played({ screen }: { screen: BattleScreen }): Promise<void> {
    await settled()
    for(let skips = 0; skips < 10 && screen.mode === "playing"; skips++){
        screen.catchUp()
        await settled()
    }
}

/** The units of the players in a battle. */
function playersOf(battle: Battle): Unit[] {
    return battle.initiative.filter(unit => unit.controller === "player")
}

// --- Tests ---

describe("BattleScreen", () => {
    test("nothing locked → it starts the first round, a draft for each unit of the players", async() => {
        const game = shown()
        await played(game)
        const { battle, screen } = game
        expect(battle.phase).toBe("preparation")
        expect(screen.mode).toBe("planning")
        expect([...screen.drafts.keys()]).toEqual(playersOf(battle))
    })

    test("a unit locked → no draft for it, the others planned", async() => {
        const locks: BattleLocks = { round: "launch", isLocked: unit => unit.name === "Guerrier" }
        const game = shown(locks)
        await played(game)
        const { battle, screen } = game
        const free = playersOf(battle).filter(unit => !locks.isLocked(unit))
        expect([...screen.drafts.keys()]).toEqual(free)
    })

    test("a unit locked with no chain, the round launched → held back, told why", async() => {
        const game = shown()
        await played(game)
        const { battle, screen } = game
        const [locked] = playersOf(battle)
        screen.locks = { round: "launch", isLocked: unit => unit === locked }
        screen.launch()
        expect(battle.phase).toBe("preparation")
        expect(screen.warning).not.toBe(null)
    })

    test("the round launched → played out at once, shown, then the next one opens", async() => {
        const game = shown()
        await played(game)
        const { battle, screen } = game
        screen.launch()
        expect(battle.round).toBeGreaterThanOrEqual(1)
        await settled()
        expect(screen.mode).toBe("playing")
        await played(game)
        expect(battle.round).toBe(2)
        expect(screen.mode).toBe("planning")
    })

    test("ready → the chains committed, nothing launched, every control given up", async() => {
        const game = shown()
        await played(game)
        const { battle, screen } = game
        screen.locks = { ...NO_BATTLE_LOCKS, round: "ready" }
        expect(screen.launchable).toBe(true)
        screen.launch()
        expect(battle.phase).toBe("preparation")
        expect(battle.awaited.units).toEqual([])
        expect(screen.launchable).toBe(false)
        expect(screen.drafts.size).toBe(0)
        for(const unit of playersOf(battle)) expect(screen.isLocked(unit)).toBe(true)
    })

    test("ready, the round then played elsewhere → the next preparation is the players' again", async() => {
        const game = shown()
        await played(game)
        const { battle, screen } = game
        screen.locks = { ...NO_BATTLE_LOCKS, round: "ready" }
        screen.launch()
        battle.advance()
        await played(game)
        battle.advance()
        await played(game)
        expect(screen.launchable).toBe(true)
        expect(screen.drafts.size).toBeGreaterThan(0)
    })

    test("gather → the screen draws the rounds, its button only says the players are ready", async() => {
        const game = shown({ ...NO_BATTLE_LOCKS, round: "gather" })
        await played(game)
        const { battle, screen } = game
        expect(battle.round).toBe(1)
        expect(screen.saysReady).toBe(true)
        screen.launch()
        expect(battle.phase).toBe("preparation")
        expect(game.readies()).toBe(1)
        expect(screen.launchable).toBe(false)
    })

    test("gather, the round started → played, and the next one drawn by the screen", async() => {
        const game = shown({ ...NO_BATTLE_LOCKS, round: "gather" })
        await played(game)
        const { battle, screen } = game
        screen.launch()
        screen.startRound()
        await played(game)
        expect(battle.round).toBe(2)
        expect(screen.drafts.size).toBeGreaterThan(0)
    })

    test("a chain committed elsewhere, the round started → its cards left the hand shown", async() => {
        const others = new Set<string>()
        const game = shown({ isLocked: unit => others.has(unit.name), round: "gather" })
        await played(game)
        const { battle, screen } = game
        const [unit] = playersOf(battle)
        others.add(unit.name)
        const before = screen.scene.of(unit)?.hand.length ?? 0
        battle.commit(unit, CardChain.leftToRight(unit.hand, unit.stats.chainSize.value))
        expect(screen.scene.of(unit)?.hand).toHaveLength(before)
        for(const each of battle.awaited.units) battle.commit(each, new CardChain())
        screen.startRound()
        expect(screen.scene.of(unit)?.hand.length).toBe(unit.hand.length)
    })

    test("a unit of the other team the only one planned → the viewpoint is its team", async() => {
        const game = shown()
        await played(game)
        const { battle, screen } = game
        const enemy = battle.units.find(unit => unit.team !== screen.viewpoint)
        if(!enemy) throw new Error("No enemy in the battle.")
        battle.control(enemy, "player")
        screen.locks = { isLocked: unit => unit !== enemy, round: "ready" }
        expect(screen.viewpoint).toBe(enemy.team)
    })

    test("ready for a round, the next drawn → the units of the players still animate", async() => {
        const game = shown({ ...NO_BATTLE_LOCKS, round: "gather" })
        await played(game)
        const { battle, setup, screen } = game
        screen.launch()
        screen.startRound()
        let flown = false
        for(let frame = 0; frame < 20000 && battle.round < 3 && !flown; frame++){
            screen.frame(setup.frame(), NO_WORLD, 1 / 20)
            await settled()
            flown = screen.scene.flight !== null
            if(screen.mode === "planning" && !screen.isLocked(playersOf(battle)[0])) break
        }
        expect(flown).toBe(true)
    })

    test("a round starting → its units listed while it draws", async() => {
        const game = shown()
        await settled()
        expect(game.screen.scene.order).toEqual(game.battle.initiative)
        expect(game.screen.scene.order.length).toBeGreaterThan(0)
    })

    test("a save come while a round plays back → the units shown stay listed", async() => {
        const game = shown({ ...ALL_BATTLE_LOCKS })
        const { battle, screen } = game
        const lineUp = async(): Promise<void> => {
            for(let turn = 0; turn < 10; turn++) await settled()
        }
        battle.advance()
        battle.load(battle.save())
        await lineUp()
        for(const unit of battle.awaited.units) battle.commit(unit, new CardChain())
        battle.load(battle.save())
        await lineUp()
        const shownBefore = screen.scene.order.filter(unit => screen.scene.alive(unit))
        expect(shownBefore.length).toBeGreaterThan(0)
        battle.advance()
        await lineUp()
        expect(screen.mode).toBe("playing")
        battle.advance()
        battle.load(battle.save())
        await settled()
        expect(screen.scene.order.filter(unit => screen.scene.alive(unit))).toEqual(shownBefore)
    })

    test("a unit coming in the order → listed after the one it follows", async() => {
        const game = shown()
        await played(game)
        const { screen } = game
        const [first, second, ...rest] = screen.scene.order
        screen.scene.reorder([first, ...rest])
        screen.scene.enterOrder(second, [first, second, ...rest])
        expect(screen.scene.order).toEqual([first, second, ...rest])
    })

    test("a body out of the order coming → left out of it", async() => {
        const game = shown()
        await played(game)
        const { screen } = game
        const [first, ...rest] = screen.scene.order
        screen.scene.enterOrder(first, rest)
        expect(screen.scene.order).toEqual([first, ...rest])
    })

    test("waiting → the screen launches nothing and starts nothing", async() => {
        const game = shown(ALL_BATTLE_LOCKS)
        await played(game)
        const { battle, screen } = game
        expect(battle.phase).toBe("draw")
        expect(screen.launchable).toBe(false)
        expect(screen.skippable).toBe(false)
        expect(screen.drafts.size).toBe(0)
    })

    test("a load while another waits → what was left dropped, the last shown", async() => {
        const source = shown()
        await played(source)
        const save = source.battle.save()
        const game = shown(ALL_BATTLE_LOCKS)
        await played(game)
        const { battle, screen } = game
        battle.load(save)
        await settled()
        expect(screen.scene.of(battle.units[0])).toBeDefined()
        battle.load(save)
        battle.load(save)
        await settled()
        expect(screen.scene.of(battle.units[0])).toBeDefined()
    })

    test("another battle given → what was going on dropped, it is shown", async() => {
        const game = shown()
        await played(game)
        const { screen } = game
        const next = new Run(4).newBattle()
        screen.engine = next
        await played(game)
        expect(screen.engine).toBe(next)
        expect(next.phase).toBe("preparation")
    })

    test("frames go by → it stands", async() => {
        const game = shown()
        await played(game)
        const { setup, screen } = game
        screen.frame(setup.frame(), NO_WORLD, 1 / 60)
        setup.ui.render()
        await settled()
    })
})
