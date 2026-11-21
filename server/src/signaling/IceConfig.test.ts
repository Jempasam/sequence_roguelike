import { describe, expect, test } from "vitest"

import { TurnCredentials } from "../turn"
import { IceConfig } from "./IceConfig"

const credentials = new TurnCredentials("a secret for the tests only")

describe("IceConfig", () => {
    test("no credentials → STUN only", () => {
        const servers = new IceConfig({ publicHost: "example.org", port: 3478 }).serversFor("abc")
        expect(servers).toEqual([{ urls: ["stun:example.org:3478"] }])
    })

    test("credentials → STUN, then TURN over UDP and TCP", () => {
        const servers = new IceConfig({ publicHost: "example.org", port: 3478, credentials }).serversFor("abc")
        expect(servers).toHaveLength(2)
        expect(servers[0]).toEqual({ urls: ["stun:example.org:3478"] })
        expect(servers[1].urls).toEqual([
            "turn:example.org:3478?transport=udp",
            "turn:example.org:3478?transport=tcp",
        ])
    })

    test("a TLS port → a turns url is added", () => {
        const servers = new IceConfig({ publicHost: "example.org", port: 3478, tlsPort: 5349, credentials }).serversFor("abc")
        expect(servers[1].urls).toContain("turns:example.org:5349?transport=tcp")
        expect(servers[1].urls).toHaveLength(3)
    })

    test("a TLS port but no credentials → no turns url, since there is no TURN", () => {
        const servers = new IceConfig({ publicHost: "example.org", port: 3478, tlsPort: 5349 }).serversFor("abc")
        expect(servers).toEqual([{ urls: ["stun:example.org:3478"] }])
    })

    test("credentials → issued for the session, and they check", () => {
        const [, turn] = new IceConfig({ publicHost: "h", port: 1, credentials }).serversFor("abc")
        expect(turn.username).toBeDefined()
        expect(credentials.holderOf(turn.username as string)).toBe("abc")
        expect(credentials.check(turn.username as string, turn.credential as string)).toBe(true)
    })

    test("two sessions → each gets credentials of its own", () => {
        const config = new IceConfig({ publicHost: "h", port: 1, credentials })
        const a = config.serversFor("aaa")[1]
        const b = config.serversFor("bbb")[1]
        expect(a.username).not.toBe(b.username)
        expect(a.credential).not.toBe(b.credential)
    })

    test("a session id that is not valid for credentials → refused rather than issued", () => {
        const config = new IceConfig({ publicHost: "h", port: 1, credentials })
        expect(() => config.serversFor("NOT VALID")).toThrow()
    })
})
