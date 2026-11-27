import { describe, expect, test } from "vitest"
import {
    NECROMANCER_HALT,
    NECROMANCER_OFFER_SIZE,
} from "@game/core-src/games/mecard/sim/halt/subs/party/NecromancerHalt"
import { KEPT_LOOT_HEARTS, SPENT_LOOT_HEARTS } from "@game/core-src/games/mecard/sim/run/heartLoot"
import type { Text } from "@game/core-src/semantic/Text"
import type { Shown, Way } from "@game/core-src/games/mecard/sim/halt/HaltContext"
import type { HeartLoot } from "@game/core-src/games/mecard/sim/run/heartLoot"

import { ScriptedPlayer } from "../../../../../../fixtures/haltFixtures"
import { startedRun } from "../../../../../../fixtures/startedRun"

/** A player remembering the hearts it was offered, each time it was. */
class Watching extends ScriptedPlayer {


    public readonly offered: HeartLoot[][] = []

    public override offer<T>(
        title: Text, offers: readonly T[], show: (offer: T) => Shown, done: (offer: T) => void, way?: Way,
    ): void {
        this.offered.push(offers as readonly unknown[] as HeartLoot[])
        super.offer(title, offers, show, done, way)
    }
}

// --- Tests ---

describe("NecromancerHalt", () => {
    test("a character given hearts that last, then hearts used once, each among two kinds", () => {
        const run = startedRun(1)
        const [hero] = run.heroes
        const size = hero.hearts.length
        const halt = NECROMANCER_HALT.create(run)
        const player = new Watching(run)
        halt.start(player)
        player.play()
        expect(halt.hasImpact).toBe(true)
        const [kept, spent] = player.offered
        expect(player.offered).toHaveLength(2)
        expect(new Set(kept).size).toBe(NECROMANCER_OFFER_SIZE)
        expect(new Set(spent).size).toBe(NECROMANCER_OFFER_SIZE)
        expect(kept.every(loot => KEPT_LOOT_HEARTS.includes(loot))).toBe(true)
        expect(spent.every(loot => SPENT_LOOT_HEARTS.includes(loot))).toBe(true)
        expect(hero.hearts).toHaveLength(size + kept[0].count + spent[0].count)
    })

    test("nothing given before the second choice", () => {
        const run = startedRun(1)
        const [hero] = run.heroes
        const size = hero.hearts.length
        const halt = NECROMANCER_HALT.create(run)
        const player = new Watching(run)
        halt.start(player)
        player.answer()
        player.answer()
        expect(player.offered).toHaveLength(2)
        expect(halt.hasImpact).toBe(false)
        expect(hero.hearts).toHaveLength(size)
    })

    test("opened again, it offers the same hearts", () => {
        const run = startedRun(1)
        const halt = NECROMANCER_HALT.create(run)
        const first = new Watching(run)
        halt.start(first)
        first.answer()
        const again = new Watching(run)
        halt.start(again)
        again.answer()
        expect(again.offered).toEqual(first.offered)
    })
})
