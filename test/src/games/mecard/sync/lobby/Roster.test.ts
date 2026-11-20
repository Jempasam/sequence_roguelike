import {
    cleanName, hueOfName, DEFAULT_NAME, HOST_ID, LOBBY_VERSION, LobbyRoom, LocalRoom, LocalSync, NAME_LENGTH,
    PROFILE_REFUSED_TOPIC, PROFILE_TOPIC, Roster, RosterView, uniqueName, writeProfileMessage, writeRefusedMessage,
} from "@game/core/mecard/sync"
import type { SyncPeer } from "@game/core/mecard/sync"
import { VersionMismatchFault } from "@game/core"
import type { Fault } from "@game/core"
import { describe, expect, test } from "vitest"

/** A lobby with its roster, the way the host keeps it. */
function hosting(hostName = "Hôte"): { room: LocalRoom, channel: LocalSync, roster: Roster } {
    const room = new LocalRoom()
    const channel = new LocalSync()
    const roster = new Roster(new LobbyRoom(room), channel, hostName)
    return { room, channel, roster }
}

/** A client that connects and says who it is. */
function arriving(
    { room, channel }: { room: LocalRoom, channel: LocalSync },
    id: string,
    name: string,
): RosterView {
    return new RosterView(room.join(id), channel, name)
}

const names = (view: { members: readonly { name: string }[] }): string[] => view.members.map(member => member.name)

describe("names", () => {
    test("cleanName → trimmed, on one line, short, never empty", () => {
        expect(cleanName("  Ana \n  Bel  ")).toBe("Ana Bel")
        expect(cleanName("x".repeat(100)).length).toBeLessThanOrEqual(NAME_LENGTH)
        expect(cleanName("   ")).toBe(DEFAULT_NAME)
        expect(cleanName("\u0000\u0007")).toBe(DEFAULT_NAME)
    })

    test("uniqueName → numbered when taken, whatever the capitals, and within the length", () => {
        expect(uniqueName("Ana", ["Bel"])).toBe("Ana")
        expect(uniqueName("Ana", ["ANA"])).toBe("Ana 2")
        expect(uniqueName("Ana", ["Ana", "Ana 2"])).toBe("Ana 3")
        expect(uniqueName("x".repeat(NAME_LENGTH), ["x".repeat(NAME_LENGTH)]).length).toBeLessThanOrEqual(NAME_LENGTH)
    })

    test("hueOfName → the same for the same name, a hue of the circle", () => {
        expect(hueOfName("Ana")).toBe(hueOfName("Ana"))
        expect(hueOfName("Ana")).toBeGreaterThanOrEqual(0)
        expect(hueOfName("Ana")).toBeLessThan(360)
        const hues = new Set(["Ana", "Bel", "Cyd", "Dan", "Eve", "Fay", "Gus", "Hal"].map(hueOfName))
        expect(hues.size).toBeGreaterThan(1)
    })
})

describe("Roster", () => {
    test("nobody else → the host alone", () => {
        const { roster } = hosting()
        expect(roster.members).toEqual([{ id: HOST_ID, name: "Hôte", lost: false }])
    })

    test("a client says who it is → in the list for everyone, and told who it is", () => {
        const lobby = hosting()
        const ana = arriving(lobby, "a", "Ana")
        expect(names(lobby.roster)).toEqual(["Hôte", "Ana"])
        expect(names(ana)).toEqual(["Hôte", "Ana"])
        expect(ana.self).toEqual({ id: "a", name: "Ana" })
    })

    test("a client that connects and says nothing → not in the list", () => {
        const lobby = hosting()
        lobby.room.join("mute")
        expect(names(lobby.roster)).toEqual(["Hôte"])
    })

    test("same name twice, or the name of the host → the later one is numbered, and told so", () => {
        const lobby = hosting()
        const first = arriving(lobby, "a", "Ana")
        const second = arriving(lobby, "b", "ana")
        const third = arriving(lobby, "c", "Hôte")
        expect(names(lobby.roster)).toEqual(["Hôte", "Ana", "ana 2", "Hôte 2"])
        expect(first.self?.name).toBe("Ana")
        expect(second.self?.name).toBe("ana 2")
        expect(third.self?.name).toBe("Hôte 2")
    })

    test("a client changing its name → the list follows, without clashing with its old one", () => {
        const lobby = hosting()
        const ana = arriving(lobby, "a", "Ana")
        ana.rename("Ana")
        expect(names(lobby.roster)).toEqual(["Hôte", "Ana"])
        ana.rename("Anaïs")
        expect(names(lobby.roster)).toEqual(["Hôte", "Anaïs"])
        expect(ana.self?.name).toBe("Anaïs")
    })

    test("the host taking the name of a guest → it is numbered, the guest keeps its own", () => {
        const lobby = hosting()
        arriving(lobby, "a", "Ana")
        lobby.roster.rename("Ana")
        expect(names(lobby.roster)).toEqual(["Ana 2", "Ana"])
    })

    test("a client lost then back, or gone → marked lost, then not, then out of the list", () => {
        const lobby = hosting()
        const ana = arriving(lobby, "a", "Ana")
        lobby.room.drop("a")
        expect(lobby.roster.members.map(member => member.lost)).toEqual([false, true])
        lobby.room.back("a")
        expect(lobby.roster.members.map(member => member.lost)).toEqual([false, false])
        expect(ana.self?.name).toBe("Ana")
        lobby.room.leave("a")
        expect(names(lobby.roster)).toEqual(["Hôte"])
    })

    test("a client that comes later → told the list as it stands, by what the channel gives on connecting", () => {
        const lobby = hosting()
        arriving(lobby, "a", "Ana")
        const heard: string[] = []
        lobby.channel.listen(message => heard.push(message))
        expect(heard).toHaveLength(1)
        expect(heard[0].startsWith("roster:")).toBe(true)
    })

    test("a client of another version → turned away and told, not in the list", () => {
        const lobby = hosting()
        const faults: Fault[] = []
        lobby.roster.faulted.add(fault => faults.push(fault))
        const link = lobby.room.join("old")
        const refused: string[] = []
        PROFILE_REFUSED_TOPIC.link(link).listen(text => refused.push(text))
        PROFILE_TOPIC.link(link).send(writeProfileMessage({ version: 0, name: "Old" }))
        expect(refused).toEqual([`{"ours":${LOBBY_VERSION}}`])
        expect(faults).toHaveLength(1)
        expect(names(lobby.roster)).toEqual(["Hôte"])
    })

    test("a client told it is turned away → refused, as a fault of version", () => {
        const room = new LocalRoom()
        let host: SyncPeer|null = null
        room.onJoin(peer => { host = peer })
        const view = new RosterView(room.join("new"), new LocalSync(), "New")
        const refused: Fault[] = []
        view.refused.add(fault => refused.push(fault))
        PROFILE_REFUSED_TOPIC.link(host as unknown as SyncPeer).send(writeRefusedMessage({ ours: 2 }))
        expect(refused).toHaveLength(1)
        expect(refused[0]).toBeInstanceOf(VersionMismatchFault)
    })

    test("a profile that is no profile → left out and told, nothing thrown", () => {
        const lobby = hosting()
        const faults: Fault[] = []
        lobby.roster.faulted.add(fault => faults.push(fault))
        const link = lobby.room.join("odd")
        expect(() => PROFILE_TOPIC.link(link).send("not json")).not.toThrow()
        expect(faults).toHaveLength(1)
        expect(names(lobby.roster)).toEqual(["Hôte"])
    })
})
