import { describe, expect, test } from "vitest"
import {
    BOW_MODULE, CardChain, CONJURATION, FIRE, IMPROVISED_ROBOT, planFor, Run, saveBattle, SECRET_CARD, SHADOW,
    splitDeck, STONE, WATER, WIND,
} from "@game/core/mecard"
import type { Battle, Card } from "@game/core/mecard"
import { BattleBroadcaster, BattleReceiver, LocalSync, writeBattleMessage } from "@game/core/mecard/sync"
import type { BattleDesync } from "@game/core/mecard/sync"
import { started } from "../../sim/fixtures"

// --- Fixture builders ---

/** A battle for a viewer to load into. */
function empty(): Battle {
    return new Run(0).newBattle()
}

/** A main client telling the first battle of a run, and viewers listening to it, their drifts kept. */
function session(
    options: { viewers?: number, secret?: boolean, held?: boolean, seed?: number, run?: Run } = {},
) {
    const channel = new LocalSync(options.held ?? false)
    const main = started(options.run ?? new Run(options.seed ?? 11))
    const viewers = Array.from({ length: options.viewers ?? 1 }, () => new BattleReceiver(empty(), channel))
    const drifts: BattleDesync[] = []
    for(const viewer of viewers) viewer.onDesync = desync => drifts.push(desync)
    const broadcaster = new BattleBroadcaster(main, channel, { secret: options.secret })
    return { channel, main, viewers, drifts, broadcaster }
}

/**
 * Commit what the bot would play for every unit of the main battle with no chain yet, then play its round
 * out and start the next one, as its screen does once it showed the round.
 */
function playMain(main: Battle): void {
    for(const unit of main.initiative) if(!main.planOf(unit)) main.commit(unit, planFor(unit))
    main.endPreparation()
    main.playRound()
    if(main.waiting) main.advance()
}

/** The battle a viewer watches, which it must have. */
function watched(viewer: BattleReceiver): Battle {
    if(!viewer.engine) throw new Error("The viewer has no battle.")
    return viewer.engine
}

/** A battle saved, as text. */
function textOf(battle: Battle, secret = false): string {
    return JSON.stringify(saveBattle(battle, { secret }))
}

// --- Tests ---

describe("BattleReceiver", () => {
    test.each([false, true])("a hero with two decks, secret %s → no drift over a whole battle", secret => {
        const run = new Run(11)
        const [hero] = run.heroes
        splitDeck(hero, hero.decks[0], run.rng)
        const { main, drifts } = session({ secret, run })
        for(let round = 0; round < 30 && main.phase === "preparation"; round++) playMain(main)
        expect(main.units[0].decks.all).toHaveLength(2)
        expect(drifts).toEqual([])
    })

    test("two viewers follow a whole battle → the state of the main one at each round, no drift", () => {
        const { main, viewers, drifts } = session({ viewers: 2, seed: 13 })
        for(let round = 0; round < 30 && main.phase === "preparation"; round++){
            playMain(main)
            for(const viewer of viewers) expect(textOf(watched(viewer))).toBe(textOf(main))
        }
        expect(main.phase).toBe("over")
        expect(drifts).toEqual([])
        for(const viewer of viewers) expect(watched(viewer).winner?.name).toBe(main.winner?.name)
    })

    test("robots, whirlwinds, waves and flames in play → the viewer follows, no drift", () => {
        const { main, viewers: [viewer], drifts } = session({ seed: 5 })
        const rows: readonly (readonly Card[])[] = [
            [IMPROVISED_ROBOT, BOW_MODULE, CONJURATION, WIND], [CONJURATION, WATER, SHADOW],
            [CONJURATION, FIRE, CONJURATION, STONE],
        ]
        for(let round = 0; round < 12 && main.phase === "preparation"; round++){
            const [hero] = main.initiative.filter(unit => unit.controller === "player")
            const row = rows[round % rows.length]
            hero.hand.push(...row)
            main.commit(hero, new CardChain([...row]))
            for(const unit of main.initiative) if(!main.planOf(unit)) main.commit(unit, planFor(unit))
            main.endPreparation()
            main.playRound()
            if(main.waiting) main.advance()
            expect(textOf(watched(viewer))).toBe(textOf(main))
        }
        expect(drifts).toEqual([])
    })

    test("secret → the piles hidden from the viewer, the same rounds, no drift", () => {
        const { main, viewers: [viewer], drifts } = session({ secret: true })
        for(let round = 0; round < 30 && main.phase === "preparation"; round++){
            playMain(main)
            const piles = watched(viewer).units.filter(unit => unit.decks.all.length > 0).flatMap(unit => unit.decks.all[0].pile)
            expect(piles.every(card => card === SECRET_CARD)).toBe(true)
        }
        expect(drifts).toEqual([])
        expect(watched(viewer).winner?.name).toBe(main.winner?.name)
    })

    test.each([false, true])("a preparation told, secret %s → the chains of the bots with it, no drift", secret => {
        const { main, viewers: [viewer], drifts } = session({ secret })
        playMain(main)
        const bots = watched(viewer).initiative.filter(unit => unit.controller === "bot")
        expect(bots.length).toBeGreaterThan(0)
        for(const bot of bots) expect(watched(viewer).planOf(bot)?.cards.length).toBeGreaterThan(0)
        expect(drifts).toEqual([])
    })

    test("late, a whole round behind → what came is taken in at once, in order", () => {
        const { channel, main, viewers: [viewer], drifts } = session({ held: true })
        playMain(main)
        playMain(main)
        channel.flush()
        expect(textOf(watched(viewer))).toBe(textOf(main))
        expect(drifts).toEqual([])
    })

    test("a launch → the round played out at once, whatever shows it", () => {
        const { main, viewers: [viewer] } = session()
        for(const unit of main.initiative) main.commit(unit, planFor(unit))
        main.endPreparation()
        expect(watched(viewer).executing).toBe(false)
        expect(watched(viewer).round).toBe(main.round)
    })

    test("a viewer whose round went otherwise → a drift told", () => {
        const { main, viewers: [viewer], drifts } = session()
        for(const unit of main.initiative) main.commit(unit, planFor(unit))
        main.endPreparation()
        main.playRound()
        const [unit] = watched(viewer).living
        unit.hearts.damage(1, "physical", null)
        main.advance()
        expect(drifts).toEqual([{ number: 1, round: main.round }])
    })

    test("a message older than the one loaded → ignored", () => {
        const main = started(new Run(11))
        const viewer = new BattleReceiver(empty(), new LocalSync())
        const save = saveBattle(main)
        let loads = 0
        watched(viewer).loaded.add(() => loads++)
        viewer.receive(writeBattleMessage({ kind: "save", number: 1, sequence: 2, secret: false, save }))
        viewer.receive(writeBattleMessage({ kind: "save", number: 1, sequence: 1, secret: false, save }))
        expect(loads).toBe(1)
    })

    test("a message in another shape → told to onError, nothing loaded", () => {
        const viewer = new BattleReceiver(empty(), new LocalSync())
        const errors: unknown[] = []
        viewer.onError = error => errors.push(error)
        let loads = 0
        watched(viewer).loaded.add(() => loads++)
        viewer.receive("{\"kind\":\"hello\"}")
        expect(errors).toHaveLength(1)
        expect(loads).toBe(0)
    })

    test("no battle watched → what comes is left out", () => {
        const main = started(new Run(11))
        const viewer = new BattleReceiver(null, new LocalSync())
        const save = saveBattle(main)
        viewer.receive(writeBattleMessage({ kind: "save", number: 1, sequence: 1, secret: false, save }))
        expect(viewer.engine).toBe(null)
    })
})

describe("BattleBroadcaster", () => {
    test("a battle in its preparation → sent at once; the next battle → told apart", () => {
        const channel = new LocalSync()
        const sent: string[] = []
        channel.listen(message => sent.push(message))
        const run = new Run(2)
        const broadcaster = new BattleBroadcaster(started(run), channel)
        broadcaster.engine = started(run)
        expect(sent.map(message => JSON.parse(message).number)).toEqual([1, 2])
    })

    test("disposed → sends nothing", () => {
        const channel = new LocalSync()
        const sent: string[] = []
        channel.listen(message => sent.push(message))
        const battle = started(new Run(2))
        const broadcaster = new BattleBroadcaster(battle, channel)
        broadcaster.dispose()
        playMain(battle)
        expect(sent).toHaveLength(1)
    })

    test("a viewer connecting → hears the last message of the battle, none between two", () => {
        const channel = new LocalSync()
        const broadcaster = new BattleBroadcaster(started(new Run(2)), channel)
        const heard: string[] = []
        channel.listen(message => heard.push(message))
        expect(heard).toHaveLength(1)
        broadcaster.engine = null
        const after: string[] = []
        channel.listen(message => after.push(message))
        expect(after).toEqual([])
    })
})
