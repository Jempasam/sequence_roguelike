import { describe, expect, test } from "vitest"
import { PUSH } from "@game/core/mecard"

import { battle, chain, MONSTERS, unit } from "../../../fixtures"

// --- Tests ---

describe("PUSH.preview", () => {
    test("nobody ahead → its reach shown all the same", () => {
        const on = battle()
        const pusher = unit(on, 3, 5)
        const [root] = chain(PUSH).preview(on, pusher)
        expect(root.preview?.indicators.map(indicator => indicator.kind)).toEqual(["polygon", "label"])
    })

    test("a unit in reach → its reach, then where it would be pushed to", () => {
        const on = battle()
        const pusher = unit(on, 3, 5)
        unit(on, 3, 4.2, { team: MONSTERS })
        const [root] = chain(PUSH).preview(on, pusher)
        expect(root.preview?.indicators.map(indicator => indicator.kind)).toEqual(["polygon", "arrow"])
    })
})
