import {
    BadSecretFault, ConnectionLostFault, Fault, HostLostServerFault, NetError, NotHostFault, OutboxFullFault,
    RefusedFault, RoomFullFault, RoomNotFoundFault, RoomTakenFault, SessionExpiredFault, UnreachableFault,
    VersionMismatchFault, faultOf,
} from "@game/core"
import type { NetErrorReason } from "@game/core"
import { describe, expect, test } from "vitest"

describe("faultOf", () => {
    test.each([
        ["not-found", RoomNotFoundFault],
        ["full", RoomFullFault],
        ["refused", RefusedFault],
        ["taken", RoomTakenFault],
    ] as const)("NetError %s → its own fault", (reason, expected) => {
        expect(faultOf(new NetError(reason, "said"))).toBeInstanceOf(expected)
    })

    test.each<NetErrorReason>(["unreachable", "protocol", "closed"])(
        "NetError %s → unreachable, with what it said",
        reason => {
            const fault = faultOf(new NetError(reason, "the layer below said this"))
            expect(fault).toBeInstanceOf(UnreachableFault)
            expect((fault as UnreachableFault).detail).toBe("the layer below said this")
        },
    )

    test("another error → unreachable, with its message", () => {
        const fault = faultOf(new Error("plain"))
        expect(fault).toBeInstanceOf(UnreachableFault)
        expect((fault as UnreachableFault).detail).toBe("plain")
    })

    test("a thing that is not an error → unreachable, with its text", () => {
        const fault = faultOf("just a string")
        expect(fault).toBeInstanceOf(UnreachableFault)
        expect((fault as UnreachableFault).detail).toBe("just a string")
    })
})

describe("faults", () => {
    test("faults without a peer → who is null", () => {
        const faults: Fault[] = [
            new UnreachableFault("x"), new RoomNotFoundFault(), new RoomTakenFault(), new RoomFullFault(),
            new RefusedFault(), new HostLostServerFault(), new NotHostFault(),
        ]
        for(const fault of faults) expect(fault.who).toBeNull()
    })

    test("faults of a peer → who is that peer, and the description names it", () => {
        expect(new BadSecretFault("p1").who).toBe("p1")
        expect(new BadSecretFault("p1").describe()).toContain("p1")
        expect(new OutboxFullFault("p2").describe()).toContain("p2")
        expect(new ConnectionLostFault("p3").describe()).toContain("p3")
        expect(new SessionExpiredFault("p4").describe()).toContain("p4")
        expect(new VersionMismatchFault("p5", 1, 2).who).toBe("p5")
    })

    test("peer unknown → described as the host or this client", () => {
        expect(new OutboxFullFault(null).describe()).toContain("the host")
        expect(new ConnectionLostFault(null).describe()).toContain("the host")
        expect(new SessionExpiredFault(null).describe()).toContain("this client")
    })

    test("version mismatch → both versions told, an unknown one as a question mark", () => {
        expect(new VersionMismatchFault("p", 3, 5).describe()).toMatch(/version 3.*is 5/)
        expect(new VersionMismatchFault("p", null, 5).describe()).toContain("version ?")
    })

    test("every fault describes itself with a sentence", () => {
        const faults: Fault[] = [
            new UnreachableFault("x"), new RoomNotFoundFault(), new RoomTakenFault(), new RoomFullFault(),
            new RefusedFault(), new HostLostServerFault(), new NotHostFault(), new ConnectionLostFault("a"),
            new SessionExpiredFault("a"), new BadSecretFault("a"), new VersionMismatchFault("a", 1, 2),
            new OutboxFullFault("a"),
        ]
        for(const fault of faults) expect(fault.describe().length).toBeGreaterThan(5)
    })
})
