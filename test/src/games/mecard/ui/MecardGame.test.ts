import { describe, expect, test } from "vitest"
import { AssetError } from "@game/core-src/engine/assets/AssetError"
import { UnreachableFault } from "@game/core-src/engine/net/NetFaults"
import { ManualScheduler } from "@game/core-src/engine/net/Scheduler"
import { MemoryStorage } from "@game/core-src/engine/save/MemoryStorage"
import { SaveSlot } from "@game/core-src/engine/save/SaveSlot"
import type { Assets } from "@game/core-src/engine/assets/Assets"
import type { Fault } from "@game/core-src/engine/net/Fault"
import { HISTORY_FORMAT, HISTORY_SLOT_KEY } from "@game/core-src/games/mecard/sim/save/historySave"
import { RUN_SAVE_FORMAT, RUN_SLOT_KEY } from "@game/core-src/games/mecard/sim/save/runSlot"
import { MecardGame } from "@game/core/mecard/game"
import type { MecardNetwork } from "@game/core/mecard/game"
import { LobbyGuest } from "@game/core-src/games/mecard/sync/lobby/LobbyGuest"
import { RunGuest } from "@game/core-src/games/mecard/sync/run/RunGuest"
import { RunReceiver } from "@game/core-src/games/mecard/sync/run/RunReceiver"
import { COOP_SEATS, FIXED_SEATS } from "@game/core-src/games/mecard/sync/run/Seats"
import { LocalRoom, LocalSync } from "@game/core-src/games/mecard/sync/SyncChannel"
import { LANCER_KIT, SWORDSMAN_KIT } from "@game/core-src/games/mecard/sim/catalog/kits"

import { bareUiSetup } from "../../../fixtures/uiFixtures"
import { startedRun } from "../../../fixtures/startedRun"

// --- Fixture builders ---

/** Pictures that never load, whatever is asked for. */
const NO_ASSETS = new Proxy({}, {
    get: () => (path: string) => Promise.reject(new AssetError(path, "unreadable", "none in the tests")),
}) as unknown as Assets

/** A game with a network within the program, the rooms it opened and the games it left for. */
function playing(ready: Promise<string|Fault> = Promise.resolve("K7QX2M")) {
    const setup = bareUiSetup(620, 348)
    const channel = new LocalSync()
    const room = new LocalRoom()
    const connections: (readonly [string, boolean])[] = []
    let opened = 0
    let joined = 0
    const network: MecardNetwork = {
        timer: new ManualScheduler(),
        open: () => {
            opened++
            return {
                room, ready, close: () => {},
                send: message => channel.send(message),
                onPeer: initial => channel.onPeer(initial),
            }
        },
        connect: (code, guest) => connections.push([code, guest]),
        directory: () => new Promise(() => {}),
        join: () => {
            joined++
            return { link: null, ready, ended: { add: () => ({ remove: () => {} }) }, close: () => {} }
        },
    }
    const toWorld = (x: number, y: number) => [x, y] as const
    const game = new MecardGame(setup.theme, setup.ui, NO_ASSETS, 3, toWorld, toWorld, null, network)
    return { game, channel, room, connections, opened: () => opened, joined: () => joined }
}

/** A game keeping its run in a slot of memory, and the slot. */
async function keeping(seed = 3) {
    const setup = bareUiSetup(620, 348)
    const toWorld = (x: number, y: number) => [x, y] as const
    const game = new MecardGame(setup.theme, setup.ui, NO_ASSETS, seed, toWorld, toWorld)
    const storage = await new MemoryStorage().open()
    const slot = new SaveSlot(storage!, RUN_SLOT_KEY, RUN_SAVE_FORMAT)
    return { game, slot, ui: setup.ui }
}

/** Let the reads and the writes of the slot settle. */
const settle = () => new Promise(resolve => setTimeout(resolve, 5))

// --- Tests ---

describe("MecardGame, its menu and its saves", () => {
    test("started → the menu is shown, the run is not", async() => {
        const { game, ui } = await keeping()
        expect(ui.layers.map(layer => layer.name)).toContain("menu")
        expect(game.run.phase).toBe("travel")
    })

    test("a run left on the map → kept, and a later game goes on with it", async() => {
        const first = await keeping()
        first.game.keep(first.slot)
        first.game.run.gold = 123
        first.game.run.startBattle()
        first.game.run.backToMap()
        await settle()
        const second = await keeping(9)
        second.game.keep(first.slot)
        await settle()
        second.game.menu.frame()
        const resume = second.game.menu.continueButton
        expect(resume?.enabled).toBe(true)
        resume?.activate()
        await settle()
        expect(second.game.run.gold).toBe(123)
        expect(second.game.menu.visible).toBe(false)
    })

    test("no run kept → Continue greyed out", async() => {
        const { game, slot } = await keeping()
        game.keep(slot)
        await settle()
        game.menu.frame()
        expect(game.menu.continueButton?.enabled).toBe(false)
    })

    test("the party fell → the save is gone, back to the menu on restart", async() => {
        const { game, slot } = await keeping()
        game.keep(slot)
        game.run.startBattle()
        game.run.backToMap()
        await settle()
        expect(await slot.load()).not.toBeNull()
        game.run.defeated.notify(game.run)
        await settle()
        expect(await slot.load()).toBeNull()
    })

    test("a game in the history → the next run holds it as a ghost from its first map", async() => {
        const { game } = await keeping()
        const storage = await new MemoryStorage().open()
        game.keepHistory(new SaveSlot(storage!, HISTORY_SLOT_KEY, HISTORY_FORMAT))
        game.run.hire(LANCER_KIT)
        game.run.defeated.notify(game.run)
        await settle()
        await game.restart()
        expect(game.run.ghosts).toHaveLength(1)
        expect(game.run.ghosts[0].party().length).toBeGreaterThan(0)
    })

    test("the party fell → the game is in the history, shown from the menu with its party", async() => {
        const { game, ui } = await keeping()
        const storage = await new MemoryStorage().open()
        game.keepHistory(new SaveSlot(storage!, HISTORY_SLOT_KEY, HISTORY_FORMAT))
        game.run.gold = 42
        game.run.defeated.notify(game.run)
        await settle()
        game.menu.frame()
        game.menu.historyButton?.activate()
        await settle()
        expect(game.history.visible).toBe(true)
        expect(game.menu.visible).toBe(false)
        expect(game.history.entries.map(entry => entry.gold)).toEqual([42])
        expect(game.history.entries[0].heroes.length).toBe(game.run.heroes.length)
        game.history.frame({ events: [], dt: 0 } as never)
        expect(ui.layers.map(layer => layer.name)).toContain("history")
        game.history.backButton.activate()
        expect(game.menu.visible).toBe(true)
        expect(game.history.visible).toBe(false)
    })

    test("New game over a kept run → asked, then the run is a new one", async() => {
        const { game, slot } = await keeping()
        await slot.save(game.run.save())
        game.keep(slot)
        await settle()
        const before = game.run
        game.menu.frame()
        game.menu.newButton?.activate()
        expect(game.menu.confirming).toBe(true)
        expect(game.run).toBe(before)
        game.menu.yesButton?.activate()
        await settle()
        expect(game.run).not.toBe(before)
        expect(game.menu.visible).toBe(false)
    })
})

describe("MecardGame, its lobby", () => {
    test("with a network → Multiplayer opens the lobby alone, and leaving it comes back to the menu", () => {
        const { game } = playing()
        game.menu.frame()
        expect(game.menu.multiplayerButton?.enabled).toBe(true)
        expect(game.lobby?.visible).toBe(false)
        game.menu.multiplayerButton?.activate()
        expect(game.menu.visible).toBe(false)
        expect(game.lobby?.visible).toBe(true)
        game.lobby?.frame()
        game.lobby?.connection.leaveButton?.activate()
        expect(game.lobby?.visible).toBe(false)
        expect(game.menu.visible).toBe(true)
    })

    test("a race started from the lobby → the screen shows a run of its own, the player's one left as it was", async() => {
        const { game, room, channel } = playing()
        const before = game.run
        game.menu.multiplayerButton?.activate()
        const lobby = game.lobby!
        lobby.frame()
        lobby.connection.nameInput.text = "Hôte"
        lobby.connection.hostButton?.activate()
        await settle()
        lobby.frame()
        const ana = new LobbyGuest(room.join("ana"), channel, "Ana", lobby.controller.modes)
        expect(lobby.controller.selection?.select("versus")).toBeNull()
        lobby.controller.start()
        await settle()
        expect(lobby.visible).toBe(false)
        expect(game.menu.visible).toBe(false)
        expect(ana.playing).toBe(true)
        expect(game.run).toBe(before)
        // The host leaves the race: back to the lobby, the session open, the client out of its game.
        lobby.controller.stop()
        expect(lobby.visible).toBe(true)
        expect(ana.playing).toBe(false)
    })

    test("no network → Multiplayer greyed out", () => {
        const setup = bareUiSetup(620, 348)
        const toWorld = (x: number, y: number) => [x, y] as const
        const game = new MecardGame(setup.theme, setup.ui, NO_ASSETS, 3, toWorld, toWorld)
        game.menu.frame()
        expect(game.menu.multiplayerButton?.enabled).toBe(false)
    })
})

describe("MecardGame.hostGame", () => {
    test("no network → refused", () => {
        const setup = bareUiSetup(620, 348)
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
        game.run.hire(LANCER_KIT)
        game.run.hire(SWORDSMAN_KIT)
        game.hostGame(COOP_SEATS, FIXED_SEATS)
        const viewer = startedRun(0)
        new RunReceiver(viewer, channel)
        expect(viewer.gold).toBe(game.run.gold)
        const guest = new RunGuest(viewer, room.join("a"), () => {})
        expect(guest.units).toEqual([game.run.heroes[1].name])
    })

    test("a battle started once hosted → told before its first round", () => {
        const { game, channel } = playing()
        game.hostGame(COOP_SEATS, FIXED_SEATS)
        const viewer = startedRun(0)
        new RunReceiver(viewer, channel)
        game.run.startBattle()
        expect(viewer.battle?.round).toBe(0)
    })

    test("a new run → told to the room, the seats given anew", async() => {
        const { game, channel, room } = playing()
        game.hostGame(COOP_SEATS, FIXED_SEATS)
        const viewer = startedRun(0)
        new RunReceiver(viewer, channel)
        const guest = new RunGuest(viewer, room.join("a"), () => {})
        game.run.gold = 999
        await game.restart()
        expect(viewer.gold).toBe(game.run.gold)
        // The new run starts with nobody in the party, so nobody to play.
        expect(guest.units).toEqual([])
    })

    test("a room that never opens → the game hostable again", async() => {
        const { game, opened } = playing(Promise.resolve(new UnreachableFault("no server")))
        game.hostGame(null, FIXED_SEATS)
        await new Promise(resolve => setTimeout(resolve))
        game.hostGame(null, FIXED_SEATS)
        expect(opened()).toBe(2)
    })
})
