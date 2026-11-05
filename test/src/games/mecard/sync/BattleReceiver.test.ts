import { describe, expect, test } from "vitest"
import {
    BOW_MODULE, CardChain, CONJURATION, FIRE, IMPROVISED_ROBOT, planFor, Run, saveBattle, SECRET_CARD, SHADOW,
    splitDeck, STONE, WATER, WIND,
} from "@game/core/mecard"
import type { Battle, Card } from "@game/core/mecard"
import { BattleBroadcaster, BattleReceiver, LocalSync, writeMessage } from "@game/core/mecard/sync"
import type { Desync } from "@game/core/mecard/sync"
import { started } from "../sim/fixtures"

// --- Fixture builders ---

/** A main client following the first battle of a run, and viewers listening to it, their drifts kept. */
function session(
    options: { viewers?: number, secret?: boolean, held?: boolean, seed?: number, run?: Run } = {},
) {
    const channel = new LocalSync(options.held ?? false)
    const main = started(options.run ?? new Run(options.seed ?? 11))
    const viewers = Array.from({ length: options.viewers ?? 1 }, () => new BattleReceiver(channel))
    const drifts: Desync[] = []
    for(const viewer of viewers) viewer.onDesync = desync => drifts.push(desync)
    const broadcaster = new BattleBroadcaster(channel, { secret: options.secret })
    broadcaster.follow(main)
    return { channel, main, viewers, drifts, broadcaster }
}

/**
 * Commit what the bot would play for every unit of the main battle, then play its round out and start the
 * next one, as its screen does once it showed the round.
 */
function playMain(main: Battle): void {
    for(const unit of main.initiative) main.commit(unit, planFor(unit))
    main.endPreparation()
    main.playRound()
    if(main.waiting) main.startRound()
}

/** The battle a viewer watches, which it must have. */
function watched(viewer: BattleReceiver): Battle {
    if(!viewer.battle) throw new Error("The viewer has no battle yet.")
    return viewer.battle
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
        const { main, viewers, drifts } = session({ secret, run })
        for(let round = 0; round < 30 && main.phase === "preparation"; round++){
            playMain(main)
            watched(viewers[0]).playRound()
        }
        expect(main.units[0].decks.all).toHaveLength(2)
        expect(drifts).toEqual([])
    })

    test("two viewers follow a whole battle → the state of the main one at each round, no drift", () => {
        const { main, viewers, drifts } = session({ viewers: 2, seed: 13 })
        for(let round = 0; round < 30 && main.phase === "preparation"; round++){
            playMain(main)
            for(const viewer of viewers){
                watched(viewer).playRound()
                expect(textOf(watched(viewer))).toBe(textOf(main))
            }
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
            for(const unit of main.initiative) if(unit !== hero) main.commit(unit, planFor(unit))
            main.endPreparation()
            main.playRound()
            if(main.waiting) main.startRound()
            watched(viewer).playRound()
            expect(textOf(watched(viewer))).toBe(textOf(main))
        }
        expect(drifts).toEqual([])
    })

    test("secret → the piles hidden from the viewer, the same rounds, no drift", () => {
        const { main, viewers: [viewer], drifts } = session({ secret: true })
        for(let round = 0; round < 30 && main.phase === "preparation"; round++){
            playMain(main)
            watched(viewer).playRound()
            const piles = watched(viewer).units.flatMap(unit => unit.decks.all[0].pile)
            expect(piles.every(card => card === SECRET_CARD)).toBe(true)
        }
        expect(drifts).toEqual([])
        expect(watched(viewer).winner?.name).toBe(main.winner?.name)
    })

    test("a launch while the viewer still plays → its round played out first, then the launch loaded", () => {
        const { channel, main, viewers: [viewer] } = session({ held: true })
        channel.flush()
        playMain(main)
        channel.flush()
        // The viewer plays the round launched, not a tick of it played yet.
        expect(watched(viewer).executing).toBe(true)
        playMain(main)
        channel.flush()
        // A preparation and a launch came: the round before was played out, the second launch loaded.
        expect(watched(viewer).executing).toBe(true)
        expect(watched(viewer).round).toBe(main.round - 1)
    })

    test("a preparation while the viewer plays → loaded only once its round is over", () => {
        const { main, viewers: [viewer] } = session()
        playMain(main)
        const playing = watched(viewer)
        expect(playing.executing).toBe(true)
        playing.tick()
        expect(watched(viewer)).toBe(playing)
        playing.playRound()
        expect(watched(viewer)).not.toBe(playing)
        expect(watched(viewer).round).toBe(main.round)
    })

    test("a viewer whose round went otherwise → a drift told", () => {
        const { main, viewers: [viewer], drifts } = session()
        playMain(main)
        const [unit] = watched(viewer).living
        unit.hearts.damage(1, "physical", null)
        watched(viewer).playRound()
        expect(drifts).toEqual([{ battle: 1, round: main.round }])
    })

    test("a message older than the one loaded → ignored", () => {
        const channel = new LocalSync()
        const main = started(new Run(11))
        const viewer = new BattleReceiver(channel)
        const save = saveBattle(main)
        viewer.receive(writeMessage({ kind: "preparation", battle: 1, sequence: 2, secret: false, save }))
        const loaded = viewer.battle
        viewer.receive(writeMessage({ kind: "preparation", battle: 1, sequence: 1, secret: false, save }))
        expect(viewer.battle).toBe(loaded)
    })

    test("a message in another shape → told to onError, nothing loaded", () => {
        const viewer = new BattleReceiver(new LocalSync())
        const errors: unknown[] = []
        viewer.onError = error => errors.push(error)
        viewer.receive("{\"kind\":\"hello\"}")
        expect(errors).toHaveLength(1)
        expect(viewer.battle).toBe(null)
    })
})

describe("BattleBroadcaster.follow", () => {
    test("a battle in its preparation → sent at once; the next battle → told apart", () => {
        const channel = new LocalSync()
        const sent: string[] = []
        channel.listen(message => sent.push(message))
        const broadcaster = new BattleBroadcaster(channel)
        const run = new Run(2)
        broadcaster.follow(started(run))
        broadcaster.follow(started(run))
        expect(sent.map(message => JSON.parse(message).battle)).toEqual([1, 2])
    })

    test("a battle followed no more → sends nothing", () => {
        const channel = new LocalSync()
        const sent: string[] = []
        channel.listen(message => sent.push(message))
        const broadcaster = new BattleBroadcaster(channel)
        const battle = started(new Run(2))
        broadcaster.follow(battle)
        broadcaster.dispose()
        playMain(battle)
        expect(sent).toHaveLength(1)
    })
})
