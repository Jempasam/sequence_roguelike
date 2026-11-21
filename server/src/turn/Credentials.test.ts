import { describe, expect, test } from "vitest"

import { TurnCredentials } from "./Credentials"

const SECRET = "a secret for the tests only"
const NOW = 1_700_000_000_000

describe("TurnCredentials", () => {
    test("a secret shorter than 16 characters → refused", () => {
        expect(() => new TurnCredentials("short")).toThrow(/16/)
        expect(() => new TurnCredentials("x".repeat(15))).toThrow()
        expect(() => new TurnCredentials("x".repeat(16))).not.toThrow()
    })

    test("issue → the username carries the expiry and the holder", () => {
        const credentials = new TurnCredentials(SECRET, 100)
        const { username } = credentials.issue("abc123", NOW)
        expect(username).toBe(`${Math.floor(NOW / 1000) + 100}-abc123`)
        expect(credentials.holderOf(username)).toBe("abc123")
    })

    test("issue → the password is hexadecimal, so it survives in a URL", () => {
        const { credential, username } = new TurnCredentials(SECRET).issue("abc", NOW)
        expect(credential).toMatch(/^[0-9a-f]+$/)
        expect(username).not.toMatch(/[:/+@]/)
    })

    test("a holder that is not lowercase letters and digits → refused", () => {
        const credentials = new TurnCredentials(SECRET)
        for(const holder of ["", "ABC", "a-b", "a:b", "a b", "é"]) expect(() => credentials.issue(holder, NOW)).toThrow()
    })

    test("check → true for what was issued, while it lasts", () => {
        const credentials = new TurnCredentials(SECRET, 100)
        const { username, credential } = credentials.issue("abc", NOW)
        expect(credentials.check(username, credential, NOW)).toBe(true)
        expect(credentials.check(username, credential, NOW + 99_000)).toBe(true)
    })

    test("check → false once expired, at the second it ends", () => {
        const credentials = new TurnCredentials(SECRET, 100)
        const { username, credential } = credentials.issue("abc", NOW)
        const expiry = (Math.floor(NOW / 1000) + 100) * 1000
        expect(credentials.check(username, credential, expiry)).toBe(true)
        expect(credentials.check(username, credential, expiry + 1)).toBe(false)
        expect(credentials.passwordOf(username, expiry + 1)).toBeNull()
    })

    test("check → false for a wrong password, of the same length or not, or an empty one", () => {
        const credentials = new TurnCredentials(SECRET)
        const { username, credential } = credentials.issue("abc", NOW)
        const flipped = (credential[0] === "0" ? "1" : "0") + credential.slice(1)
        expect(credentials.check(username, flipped, NOW)).toBe(false)
        expect(credentials.check(username, credential + "0", NOW)).toBe(false)
        expect(credentials.check(username, credential.slice(1), NOW)).toBe(false)
        expect(credentials.check(username, "", NOW)).toBe(false)
    })

    test("check → false for a username that was not issued here", () => {
        const credentials = new TurnCredentials(SECRET)
        expect(credentials.check("nobody", "x", NOW)).toBe(false)
        expect(credentials.check("", "", NOW)).toBe(false)
        expect(credentials.check("99999999999-abc", "00", NOW)).toBe(false)
    })

    test("another secret → the password does not check", () => {
        const { username, credential } = new TurnCredentials(SECRET).issue("abc", NOW)
        expect(new TurnCredentials("another secret entirely").check(username, credential, NOW)).toBe(false)
    })

    test("the username changed → the password no longer checks, even by one more year of life", () => {
        const credentials = new TurnCredentials(SECRET, 100)
        const { username, credential } = credentials.issue("abc", NOW)
        const [expiry, holder] = username.split("-")
        expect(credentials.check(`${Number(expiry) + 31_536_000}-${holder}`, credential, NOW)).toBe(false)
        expect(credentials.check(`${expiry}-other`, credential, NOW)).toBe(false)
    })

    test("passwordOf → none for a malformed username", () => {
        const credentials = new TurnCredentials(SECRET)
        for(const username of ["", "abc", "12-", "-abc", "12-ABC", "12:abc", "1a-abc"]) expect(credentials.passwordOf(username, NOW)).toBeNull()
    })

    test("holderOf → none for what is no username", () => {
        const credentials = new TurnCredentials(SECRET)
        expect(credentials.holderOf("nobody")).toBeNull()
        expect(credentials.holderOf("")).toBeNull()
    })

    test("the same holder issued twice at the same time → the same credentials", () => {
        const credentials = new TurnCredentials(SECRET)
        expect(credentials.issue("abc", NOW)).toEqual(credentials.issue("abc", NOW))
    })

    test("the default lifetime → long enough for a whole game, twelve hours", () => {
        expect(new TurnCredentials(SECRET).lifetime).toBe(12 * 60 * 60)
    })
})
