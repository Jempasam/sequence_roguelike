import { describe, expect, test } from "vitest"
import {
    ALLY_LASSO, BIG_SHOTGUN, BLOODY_COMBO, BLUE_VENGEANCE, BULLET_RAIN, COVERING_FIRE, DEMONIC_COMBO,
    HUNTER_FUSION, JOURNEY, MEGA_THRUST, QUAKE_SEISM, SUPLEX_SURPRISE, SURPRISE_THRUST,
} from "@game/core/mecard"

import { battle, chain, HEROES, MONSTERS, play, unit } from "../fixtures"

// --- Tests ---

describe("the new fusions and merges", () => {
    const cards = [
        JOURNEY, BIG_SHOTGUN, ALLY_LASSO, BLOODY_COMBO, COVERING_FIRE, BLUE_VENGEANCE, HUNTER_FUSION,
        DEMONIC_COMBO, SUPLEX_SURPRISE, SURPRISE_THRUST, MEGA_THRUST, QUAKE_SEISM, BULLET_RAIN,
    ]

    for(const card of cards){
        test(`${card.name} → previews and plays without a report`, () => {
            const on = battle()
            const hero = unit(on, 3.5, 4)
            unit(on, 2.5, 4, { team: HEROES })
            unit(on, 3.5, 2.5, { team: MONSTERS })
            const [root] = chain(card).preview(on, hero)
            expect(root.preview?.indicators.length).toBeGreaterThan(0)
            play(on, [[hero, chain(card)]])
            expect(on.events.filter(event => event.type === "error")).toEqual([])
        })
    }
})
