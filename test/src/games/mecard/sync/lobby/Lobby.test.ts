import {
    ChoiceSetting, LockedFault, Lobby, LobbyGuest, LocalRoom, LocalSync, RangeSetting, UnknownModeFault,
    InvalidSettingFault, writeModeState, LOBBY_MODE_TOPIC, QUIT_ROOM_TOPIC,
} from "@game/core/mecard/sync"
import type { GuestStage, HostStage, LobbyMode, LobbyRole, ModeRun, SettingValues } from "@game/core/mecard/sync"
import { Observable } from "@game/core/mecard"
import type { Fault } from "@game/core"
import { describe, expect, test } from "vitest"

/** A game that does nothing but record how it was played. */
class Recorded implements LobbyMode {


    public readonly description = "A game that records how it was played."
    public readonly settings = [new ChoiceSetting("size", "Taille", ["small", "big"]), new RangeSetting("lives", "Vies", 1, 5, 1, 3)]
    public readonly hosted: SettingValues[] = []
    public readonly guested: { values: SettingValues, role: LobbyRole }[] = []
    public readonly runs: { ended: Observable<Fault|null>, disposed: boolean }[] = []
    public readonly told: string[] = []

    constructor(public readonly id: string, public readonly title = id){}

    public host(stage: HostStage, values: SettingValues): ModeRun {
        this.hosted.push(values)
        stage.sender.onPeer(() => "hello")
        return this.#run()
    }

    public guest(stage: GuestStage, values: SettingValues, role: LobbyRole): ModeRun {
        this.guested.push({ values, role })
        stage.source.listen(message => this.told.push(message))
        return this.#run()
    }

    #run(): ModeRun {
        const run = { ended: new Observable<Fault|null>(() => {}), disposed: false }
        this.runs.push(run)
        return { ended: run.ended, dispose: () => { run.disposed = true } }
    }
}

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    await Promise.resolve()
    await Promise.resolve()
}

function hosting(...modes: LobbyMode[]): { room: LocalRoom, channel: LocalSync, lobby: Lobby } {
    const room = new LocalRoom()
    const channel = new LocalSync()
    return { room, channel, lobby: new Lobby(room, channel, "Hôte", modes) }
}

describe("ModeSelection", () => {
    test("first mode with its initial values, and clients told how it stands", () => {
        const { room, channel, lobby } = hosting(new Recorded("a"), new Recorded("b"))
        const ana = new LobbyGuest(room.join("a"), channel, "Ana", [])
        expect(lobby.selection.mode.id).toBe("a")
        expect(ana.selection.state).toEqual({ mode: "a", values: { size: "small", lives: 3 }, playing: false, game: 0 })
    })

    test("host selects and sets → clients follow; bad values are refused and told to nobody", () => {
        const { room, channel, lobby } = hosting(new Recorded("a"), new Recorded("b"))
        const ana = new LobbyGuest(room.join("a"), channel, "Ana", [])
        expect(lobby.selection.set("lives", 5)).toBeNull()
        expect(ana.selection.state?.values.lives).toBe(5)
        expect(lobby.selection.set("lives", 9)).toBeInstanceOf(InvalidSettingFault)
        expect(lobby.selection.set("size", "huge")).toBeInstanceOf(InvalidSettingFault)
        expect(lobby.selection.set("nope", 1)).toBeInstanceOf(InvalidSettingFault)
        expect(ana.selection.state?.values.lives).toBe(5)
        expect(lobby.selection.select("b")).toBeNull()
        expect(ana.selection.state).toEqual({ mode: "b", values: { size: "small", lives: 3 }, playing: false, game: 0 })
        expect(lobby.selection.select("zzz")).toBeInstanceOf(UnknownModeFault)
    })

    test("unreadable state → a fault, the state kept", () => {
        const { room, channel } = hosting(new Recorded("a"))
        const ana = new LobbyGuest(room.join("a"), channel, "Ana", [])
        const faults: Fault[] = []
        ana.faulted.add(fault => faults.push(fault))
        channel.send(`${LOBBY_MODE_TOPIC.name}:{"mode":1}`)
        expect(faults).toHaveLength(1)
        expect(ana.selection.state?.mode).toBe("a")
    })
})

describe("Lobby", () => {
    test("start → host and clients play it with the same values, then back to the lobby", async() => {
        const mode = new Recorded("a")
        const { room, channel, lobby } = hosting(mode)
        const ana = new LobbyGuest(room.join("a"), channel, "Ana", [mode])
        lobby.selection.set("lives", 4)
        expect(lobby.start()).toBeNull()
        await settle()
        expect(lobby.playing).toBe(true)
        expect(ana.playing).toBe(true)
        expect(mode.hosted).toEqual([{ size: "small", lives: 4 }])
        expect(mode.guested).toEqual([{ values: { size: "small", lives: 4 }, role: "player" }])
        expect(lobby.selection.set("lives", 1)).toBeInstanceOf(LockedFault)
        expect(lobby.selection.select("a")).toBeInstanceOf(LockedFault)
        expect(lobby.start()).toBeInstanceOf(LockedFault)
        // The game is over: the lobby is as it was, nothing reconnects.
        mode.runs[0].ended.notify(null)
        expect(lobby.playing).toBe(false)
        expect(ana.playing).toBe(false)
        expect(mode.runs[0].disposed).toBe(true)
        expect(mode.runs[1].disposed).toBe(true)
        expect(lobby.selection.set("lives", 1)).toBeNull()
        // And another can start.
        expect(lobby.start()).toBeNull()
        await settle()
        expect(mode.guested).toHaveLength(2)
    })

    test("what the game tells at the start through onPeer → reaches the clients that were in the lobby", async() => {
        const mode = new Recorded("a")
        const { room, channel, lobby } = hosting(mode)
        new LobbyGuest(room.join("a"), channel, "Ana", [mode])
        lobby.start()
        await settle()
        expect(mode.told.filter(message => message === "hello")).toEqual(["hello"])
    })

    test("client that comes in the middle of a game → watches, and goes back with the others", async() => {
        const mode = new Recorded("a")
        const { room, channel, lobby } = hosting(mode)
        lobby.start()
        await settle()
        const late = new LobbyGuest(room.join("late"), channel, "Tard", [mode])
        expect(mode.guested).toEqual([{ values: { size: "small", lives: 3 }, role: "spectator" }])
        expect(late.playing).toBe(true)
        lobby.stop()
        expect(late.playing).toBe(false)
    })

    test("a game that ends badly → a fault, and the lobby is unlocked", () => {
        const mode = new Recorded("a")
        const { lobby } = hosting(mode)
        const faults: Fault[] = []
        lobby.faulted.add(fault => faults.push(fault))
        lobby.start()
        mode.runs[0].ended.notify(new LockedFault())
        expect(faults).toHaveLength(1)
        expect(lobby.playing).toBe(false)
        expect(lobby.selection.playing).toBe(false)
    })

    test("a mode the client does not know → a fault, no game, the lobby goes on", async() => {
        const mode = new Recorded("a")
        const { room, channel, lobby } = hosting(mode)
        const ana = new LobbyGuest(room.join("a"), channel, "Ana", [])
        const faults: Fault[] = []
        ana.faulted.add(fault => faults.push(fault))
        lobby.start()
        await settle()
        expect(faults[0]).toBeInstanceOf(UnknownModeFault)
        expect(ana.playing).toBe(false)
        lobby.stop()
        expect(ana.selection.state?.playing).toBe(false)
    })

    test("a mode that cannot be played → the fault, and nothing locked", () => {
        const refusing: LobbyMode = { ...new Recorded("a"), settings: [], host: () => new LockedFault(), guest: () => new LockedFault() }
        const { lobby } = hosting(refusing)
        expect(lobby.start()).toBeInstanceOf(LockedFault)
        expect(lobby.playing).toBe(false)
        expect(lobby.selection.playing).toBe(false)
    })

    test("values that do not fit what the host says → the client refuses them", () => {
        const mode = new Recorded("a")
        const { room, channel } = hosting(mode)
        const ana = new LobbyGuest(room.join("a"), channel, "Ana", [mode])
        const faults: Fault[] = []
        ana.faulted.add(fault => faults.push(fault))
        channel.send(`${LOBBY_MODE_TOPIC.name}:${writeModeState({ mode: "a", values: { size: "huge", lives: 3 }, playing: true, game: 1 })}`)
        expect(faults[0]).toBeInstanceOf(InvalidSettingFault)
        expect(ana.playing).toBe(false)
    })
})

describe("chat and roster in the lobby", () => {
    test("the chat speaks under the name the host gave, and everyone hears it", () => {
        const { room, channel, lobby } = hosting(new Recorded("a"))
        const one = new LobbyGuest(room.join("1"), channel, "Ana", [])
        const two = new LobbyGuest(room.join("2"), channel, "Ana", [])
        expect(two.chat?.self.name).toBe("Ana 2")
        const heard: string[] = []
        lobby.chat.heard.add(line => heard.push(`${line.author.name}: ${line.text}`))
        two.chat?.say("salut")
        one.chat?.say("coucou")
        expect(heard).toEqual(["Ana 2: salut", "Ana: coucou"])
        expect(lobby.roster.members.map(member => member.name)).toEqual(["Hôte", "Ana", "Ana 2"])
    })

    test("a client that says it leaves the room → gone at once, without waiting for the network, and only once", () => {
        const { room, channel, lobby } = hosting(new Recorded("a"))
        const link = room.join("ana")
        const ana = new LobbyGuest(link, channel, "Ana", [new Recorded("a")])
        expect(lobby.roster.members.map(member => member.name)).toEqual(["Hôte", "Ana"])
        QUIT_ROOM_TOPIC.link(link).send("")
        expect(lobby.roster.members.map(member => member.name)).toEqual(["Hôte"])
        // The network tells it later: nothing more happens.
        room.leave("ana")
        expect(lobby.roster.members.map(member => member.name)).toEqual(["Hôte"])
        ana.dispose()
    })
})

