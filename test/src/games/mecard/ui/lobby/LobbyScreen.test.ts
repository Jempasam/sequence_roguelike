import { describe, expect, test } from "vitest"
import { ChoiceSetting, LocalRoom, LocalSync, RangeSetting, TEST_MODE } from "@game/core/mecard/sync"
import { LobbyController, LobbyScreen, nextValue } from "@game/core/mecard/lobby-ui"
import type { LobbyNetwork } from "@game/core/mecard/lobby-ui"
import type { HostEntry } from "@game/core/mecard/sync"
import { UnreachableFault } from "@game/core"
import type { Fault } from "@game/core"

import { uiSetup } from "../../../../fixtures/uiFixtures"

/** A network within the program: the room a host opens, which clients join through links. */
function network(opening: Promise<string|Fault>|null = null) {
    const room = new LocalRoom()
    const channel = new LocalSync()
    const closed: string[] = []
    let ready: (code: string) => void = () => {}
    let joins = 0
    const board = localBoard()
    const net: LobbyNetwork = {
        directory: () => Promise.resolve(board),
        open: () => ({
            room, send: message => channel.send(message), onPeer: initial => channel.onPeer(initial),
            ready: opening ?? new Promise<string>(resolve => { ready = resolve }),
            close: () => closed.push("open"),
        }),
        join: () => {
            const own = room.join(`guest${joins++}`)
            // What a client hears is what the host tells it alone and what it tells everyone, on one link.
            const link = {
                send: (message: string) => own.send(message),
                listen: (handler: (message: string) => void) => {
                    const first = own.listen(handler)
                    const second = channel.listen(handler)
                    return { dispose: () => { first.dispose(); second.dispose() } }
                },
            }
            return {
                link, ready: Promise.resolve("ROOM1"), close: () => closed.push("join"),
                ended: { add: () => ({ dispose: () => {} }) },
            }
        },
    }
    return { net, board, closed, open: (code: string) => ready(code) }
}

/** A list of hosted rooms within the program: what is announced is listed at once. */
function localBoard() {
    const listeners = new Set<(hosts: readonly HostEntry[]) => void>()
    const board = {
        hosts: [] as readonly HostEntry[],
        disposed: false,
        changed: {
            add: (listener: (hosts: readonly HostEntry[]) => void) => {
                listeners.add(listener)
                return { remove: () => { listeners.delete(listener) } }
            },
        },
        announce: (code: string, name: string) => board.set([{ code, name, seen: 0 }]),
        retire: () => board.set([]),
        dispose: () => { board.disposed = true },
        set: (hosts: readonly HostEntry[]) => {
            board.hosts = hosts
            for(const listener of listeners) listener(hosts)
        },
    }
    return board
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

function screenFor(controller: LobbyController) {
    const setup = uiSetup({}, 620, 348)
    const left: string[] = []
    const reports: string[] = []
    const screen = new LobbyScreen(setup.theme, setup.ui, controller, {
        leave: () => left.push("leave"), report: text => reports.push(text),
    }, null)
    screen.visible = true
    screen.frame()
    return { screen, left, reports }
}

describe("nextValue", () => {
    test("a choice goes to its next name and round, a range by its step and round", () => {
        const choice = new ChoiceSetting("c", "C", ["a", "b"])
        expect(nextValue(choice, "a")).toBe("b")
        expect(nextValue(choice, "b")).toBe("a")
        const range = new RangeSetting("r", "R", 1, 3, 1, 2)
        expect(nextValue(range, 2)).toBe(3)
        expect(nextValue(range, 3)).toBe(1)
    })
})

describe("LobbyScreen", () => {
    test("not in a room → host and join offered, nothing to start", () => {
        const { net } = network()
        const { screen } = screenFor(new LobbyController(net, [TEST_MODE]))
        expect(screen.connection.hostButton).not.toBeNull()
        expect(screen.connection.joinButton).not.toBeNull()
        expect(screen.connection.startButton).toBeNull()
    })

    test("no name → host and join greyed, until one is typed", () => {
        const { net } = network()
        const { screen } = screenFor(new LobbyController(net, [TEST_MODE]))
        expect(screen.connection.hostButton?.enabled).toBe(false)
        expect(screen.connection.joinButton?.enabled).toBe(false)
        screen.connection.nameInput.text = "Ana"
        expect(screen.connection.hostButton?.enabled).toBe(true)
        expect(screen.connection.joinButton?.enabled).toBe(true)
    })

    test("host → connecting, then the code and the players, with the name the host asked for", async() => {
        const { net, open } = network()
        const controller = new LobbyController(net, [TEST_MODE])
        const { screen } = screenFor(controller)
        screen.connection.nameInput.text = "Hôte"
        screen.connection.hostButton?.activate()
        expect(controller.phase).toBe("connecting")
        screen.frame()
        expect(screen.connection.hostButton).toBeNull()
        open("K7QX2M")
        await settle()
        screen.frame()
        expect(controller.phase).toBe("connected")
        expect(controller.code).toBe("K7QX2M")
        expect(screen.connection.players).toEqual(["★ Hôte (toi)"])
        expect(screen.title).toBe("Dungeon of the Mecard - Hôte")
        expect(screen.connection.startButton).not.toBeNull()
    })

    test("host sets and starts → a client sees it, cannot change it, and is locked with the others", async() => {
        const { net, open } = network()
        const host = new LobbyController(net, [TEST_MODE])
        const hosted = screenFor(host)
        hosted.screen.connection.nameInput.text = "Hôte"
        hosted.screen.connection.hostButton?.activate()
        open("CODE")
        await settle()
        const guest = new LobbyController(net, [TEST_MODE])
        const joined = screenFor(guest)
        joined.screen.connection.nameInput.text = "Ana"
        joined.screen.connection.codeInput.text = "code"
        joined.screen.connection.joinButton?.activate()
        await settle()
        hosted.screen.frame()
        joined.screen.frame()
        expect(guest.phase).toBe("connected")
        expect(host.members.map(member => member.name)).toEqual(["Hôte", "Ana"])
        expect(joined.screen.connection.players).toEqual(["★ Hôte", "  Ana (toi)"])
        const raise = hosted.screen.modes.settingButtons.get("test")?.get("joueurs")
        expect(raise).toBeDefined()
        raise?.activate()
        hosted.screen.frame()
        joined.screen.frame()
        expect(guest.view?.state?.values.joueurs).toBe(5)
        expect(joined.screen.modes.settingButtons.get("test")?.size ?? 0).toBe(0)
        expect(joined.screen.modes.titleButtons.get("test")?.enabled).toBe(false)
        hosted.screen.connection.startButton?.activate()
        await settle()
        hosted.screen.frame()
        joined.screen.frame()
        expect(host.playing).toBe(true)
        expect(guest.playing).toBe(true)
        expect(hosted.screen.modes.settingButtons.get("test")?.size ?? 0).toBe(0)
        hosted.screen.connection.startButton?.activate()
        joined.screen.frame()
        expect(host.playing).toBe(false)
        expect(guest.playing).toBe(false)
    })

    test("a room that cannot open → back out of any room, with the reason", async() => {
        const { net, closed } = network(Promise.resolve(new UnreachableFault("test")))
        const controller = new LobbyController(net, [TEST_MODE])
        const { screen } = screenFor(controller)
        screen.connection.nameInput.text = "Hôte"
        screen.connection.hostButton?.activate()
        await settle()
        screen.frame()
        expect(controller.phase).toBe("disconnected")
        expect(controller.error).not.toBeNull()
        expect(closed).toEqual(["open"])
        expect(screen.connection.hostButton).not.toBeNull()
    })

    test("leave → out of the room, the session closed", async() => {
        const { net, open, closed } = network()
        const controller = new LobbyController(net, [TEST_MODE])
        const { screen } = screenFor(controller)
        screen.connection.nameInput.text = "Hôte"
        screen.connection.hostButton?.activate()
        open("CODE")
        await settle()
        screen.frame()
        screen.connection.leaveButton?.activate()
        expect(controller.phase).toBe("disconnected")
        expect(closed).toEqual(["open"])
        screen.frame()
        expect(screen.connection.hostButton).not.toBeNull()
    })

    test("chat → the lines of the room are shown once there is a chat", async() => {
        const { net, open } = network()
        const controller = new LobbyController(net, [TEST_MODE])
        const { screen } = screenFor(controller)
        screen.connection.nameInput.text = "Hôte"
        screen.connection.hostButton?.activate()
        open("CODE")
        await settle()
        screen.frame()
        controller.chat?.say("salut")
        expect(screen.chat.lines.some(line => line.endsWith("salut"))).toBe(true)
    })

    test("not in a room → the rooms hosted are listed, and joining one joins its code", async() => {
        const { net, board } = network()
        const controller = new LobbyController(net, [TEST_MODE])
        const { screen } = screenFor(controller)
        await settle()
        expect(screen.hosts.rows).toEqual([])
        board.set([{ code: "ABCD", name: "Ana", seen: 0 }, { code: "WXYZ", name: "Bob", seen: 0 }])
        screen.frame()
        expect(screen.hosts.rows).toEqual(["Ana - ABCD", "Bob - WXYZ"])
        screen.connection.nameInput.text = "Moi"
        screen.hosts.joinButtons[1].activate()
        expect(controller.phase).toBe("connecting")
        await settle()
        expect(controller.phase).toBe("connected")
    })

    test("hosting → the room is listed, and unlisted on leaving, the list kept while hosting", async() => {
        const { net, board, open } = network()
        const controller = new LobbyController(net, [TEST_MODE])
        const { screen } = screenFor(controller)
        await settle()
        screen.connection.nameInput.text = "Hôte"
        screen.connection.hostButton?.activate()
        open("CODE")
        await settle()
        expect(board.hosts.map(host => host.code)).toEqual(["CODE"])
        screen.visible = false
        expect(board.disposed).toBe(false)
        screen.visible = true
        screen.frame()
        screen.connection.leaveButton?.activate()
        expect(board.hosts).toEqual([])
    })

    test("lobby hidden with no room → the list is let go of", async() => {
        const { net, board } = network()
        const { screen } = screenFor(new LobbyController(net, [TEST_MODE]))
        await settle()
        screen.visible = false
        expect(board.disposed).toBe(true)
    })
})
