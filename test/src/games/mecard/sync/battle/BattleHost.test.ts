import { describe, expect, test } from "vitest"
import { FusionCard, planFor, savedCard, STEP, THRUST } from "@game/core/mecard"
import type { Battle } from "@game/core/mecard"
import { PLAN_TOPIC, writePlanMessage } from "@game/core/mecard/sync"

import { connected, fight, hosted, unitOf } from "../fixtures"
import type { Hosted, Playing } from "../fixtures"

// --- Fixture builders ---

/** A first preparation hosted, a client playing the second hero. */
function preparing() {
    const session = hosted()
    const client = connected(session, "a")
    const battle = fight(session.run)
    battle.advance()
    return { session, client, battle }
}

/** Commit what the host plays. */
function hostCommits({ host }: Hosted, battle: Battle): void {
    for(const unit of battle.awaited.units) if(!host.isGuests(unit)) battle.commit(unit, planFor(unit))
}

/** Commit what a client plays on its own battle. */
function clientCommits({ guest, viewer }: Playing): void {
    const unit = unitOf(viewer.battle, guest.units[0])
    viewer.battle?.commit(unit, planFor(unit))
}

// --- Tests ---

describe("BattleHost", () => {
    test("the host ready first → told once the client gave its plan", () => {
        const { session, client, battle } = preparing()
        hostCommits(session, battle)
        session.host.ready()
        expect(session.told()).toBe(0)
        clientCommits(client)
        client.guest.ready()
        expect(session.told()).toBe(1)
        expect(battle.awaited.units).toEqual([])
    })

    test("the client ready first → told once the host is", () => {
        const { session, client, battle } = preparing()
        clientCommits(client)
        client.guest.ready()
        expect(session.told()).toBe(0)
        hostCommits(session, battle)
        session.host.ready()
        expect(session.told()).toBe(1)
    })

    test("everyone ready → the round does not move on its own", () => {
        const { session, client, battle } = preparing()
        clientCommits(client)
        client.guest.ready()
        hostCommits(session, battle)
        session.host.ready()
        expect(battle.phase).toBe("preparation")
    })

    test("a round played by the host and a client → the same battle on both sides", () => {
        const { session, client, battle } = preparing()
        clientCommits(client)
        client.guest.ready()
        hostCommits(session, battle)
        session.host.ready()
        battle.advance()
        battle.advance()
        expect(JSON.stringify(client.viewer.battle?.save())).toBe(JSON.stringify(battle.save()))
    })

    test("a second round → waited for anew", () => {
        const { session, client, battle } = preparing()
        clientCommits(client)
        client.guest.ready()
        hostCommits(session, battle)
        session.host.ready()
        battle.advance()
        battle.advance()
        hostCommits(session, battle)
        session.host.ready()
        expect(session.told()).toBe(1)
        clientCommits(client)
        client.guest.ready()
        expect(session.told()).toBe(2)
    })

    test("a fusion in the hand → the very card of the hand committed", () => {
        const { client, battle } = preparing()
        const name = client.guest.units[0]
        const unit = unitOf(battle, name)
        const fusion = new FusionCard([THRUST, STEP])
        unit.hand.push(fusion)
        const plan = { unit: name, cards: [savedCard(fusion)], usables: [] }
        PLAN_TOPIC.link(client.link).send(writePlanMessage({ round: battle.round, plans: [plan] }))
        expect(battle.planOf(unit)?.cards[0]).toBe(fusion)
    })

    test("a plan for a unit of another → told, and planned as a bot", () => {
        const { session, client, battle } = preparing()
        const errors: unknown[] = []
        session.host.onError = error => errors.push(error)
        const plan = { unit: session.run.heroes[0].name, cards: [], usables: [] }
        PLAN_TOPIC.link(client.link).send(writePlanMessage({ round: battle.round, plans: [plan] }))
        expect(errors).toHaveLength(1)
        expect(battle.planOf(unitOf(battle, session.run.heroes[0].name))).toBeUndefined()
        expect(battle.planOf(unitOf(battle, client.guest.units[0]))).toBeDefined()
    })

    test("a message that means nothing → told, and the client planned as a bot", () => {
        const { session, client, battle } = preparing()
        const errors: unknown[] = []
        session.host.onError = error => errors.push(error)
        PLAN_TOPIC.link(client.link).send("{}")
        expect(errors).toHaveLength(1)
        expect(battle.planOf(unitOf(battle, client.guest.units[0]))).toBeDefined()
    })

    test("a plan for a round gone → left out, still waited for", () => {
        const { session, client, battle } = preparing()
        PLAN_TOPIC.link(client.link).send(writePlanMessage({ round: battle.round - 1, plans: [] }))
        hostCommits(session, battle)
        session.host.ready()
        expect(session.told()).toBe(0)
    })

    test("a client leaving, the host ready → planned as a bot, the host told", () => {
        const { session, client, battle } = preparing()
        const unit = unitOf(battle, client.guest.units[0])
        hostCommits(session, battle)
        session.host.ready()
        session.room.leave("a")
        expect(battle.planOf(unit)).toBeDefined()
        expect(session.told()).toBe(1)
    })
})
