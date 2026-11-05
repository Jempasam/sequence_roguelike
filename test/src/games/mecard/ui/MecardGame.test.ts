import { describe, expect, test } from "vitest"
import { AssetError } from "@game/core"
import type { Assets } from "@game/core"
import { MecardGame } from "@game/core/mecard/game"
import type { MecardNetwork } from "@game/core/mecard/game"
import { COOP_SEATS, FIXED_SEATS, LocalRoom, LocalSync, RunGuest, RunReceiver } from "@game/core/mecard/sync"
import { Run } from "@game/core/mecard"

import { uiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** Pictures that never load, whatever is asked for. */
const NO_ASSETS = new Proxy({}, {
    get: () => (path: string) => Promise.reject(new AssetError(path, "unreadable", "none in the tests")),
}) as unknown as Assets

/** A game with a network within the program, the rooms it opened and the games it left for. */
function playing(ready: Promise<string> = Promise.resolve("K7QX2M")) {
    const setup = uiSetup({}, 620, 348)
    const channel = new LocalSync()
    const room = new LocalRoom()
    const connections: (readonly [string, boolean])[] = []
    let opened = 0
    const network: MecardNetwork = {
        open: () => {
            opened++
            return {
                room, ready, close: () => {},
                send: message => channel.send(message),
                onPeer: initial => channel.onPeer(initial),
            }
        },
        connect: (code, guest) => connections.push([code, guest]),
    }
    const toWorld = (x: number, y: number) => [x, y] as const
    const game = new MecardGame(setup.theme, setup.ui, NO_ASSETS, 3, toWorld, toWorld, null, network)
    return { game, channel, room, connections, opened: () => opened }
}

// --- Tests ---

describe("MecardGame.hostGame", () => {
    test("no network → refused", () => {
        const setup = uiSetup({}, 620, 348)
        const toWorld = (x: number, y: number) => [x, y] as const
        const game = new MecardGame(setup.theme, setup.ui, NO_ASSETS, 3, toWorld, toWorld)
        expect(() => game.hostGame(null, FIXED_SEATS)).toThrow()
    })

    test("hosted twice → refused, one room open", () => {
        const { game, opened } = playing()
        game.hostGame(null, FIXED_SEATS)
        expect(() => game.hostGame(null, FIXED_SEATS)).toThrow()
        expect(opened()).toBe(1)
    })

    test("during a battle → refused", () => {
        const { game, opened } = playing()
        game.run.startBattle()
        expect(() => game.hostGame(null, FIXED_SEATS)).toThrow()
        expect(opened()).toBe(0)
    })

    test("a client connecting → hears the run, and what it plays", () => {
        const { game, channel, room } = playing()
        game.hostGame(COOP_SEATS, FIXED_SEATS)
        const viewer = new Run(0)
        new RunReceiver(viewer, channel)
        expect(viewer.gold).toBe(game.run.gold)
        const guest = new RunGuest(viewer, room.join("a"), () => {})
        expect(guest.units).toEqual([game.run.heroes[1].name])
    })

    test("a battle started once hosted → told before its first round", () => {
        const { game, channel } = playing()
        game.hostGame(COOP_SEATS, FIXED_SEATS)
        const viewer = new Run(0)
        new RunReceiver(viewer, channel)
        game.run.startBattle()
        expect(viewer.battle?.round).toBe(0)
    })

    test("a new run → told to the room, the seats given anew", () => {
        const { game, channel, room } = playing()
        game.hostGame(COOP_SEATS, FIXED_SEATS)
        const viewer = new Run(0)
        new RunReceiver(viewer, channel)
        const guest = new RunGuest(viewer, room.join("a"), () => {})
        game.run.gold = 999
        game.restart()
        expect(viewer.gold).toBe(game.run.gold)
        expect(guest.units).toEqual([game.run.heroes[1].name])
    })

    test("a room that never opens → the game hostable again", async() => {
        const { game, opened } = playing(Promise.reject(new Error("no server")))
        game.hostGame(null, FIXED_SEATS)
        await new Promise(resolve => setTimeout(resolve))
        game.hostGame(null, FIXED_SEATS)
        expect(opened()).toBe(2)
    })
})
