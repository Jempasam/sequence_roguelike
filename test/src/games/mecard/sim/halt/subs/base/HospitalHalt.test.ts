import { describe, expect, test } from "vitest"
import { HOSPITAL_HALT, INVENTED_COUNTS, RED_HEART, SPENT_LOOT_HEARTS } from "@game/core/mecard"
import type { Text } from "@game/core"
import type { HeartLoot, Shown } from "@game/core/mecard"

import { ScriptedPlayer } from "../../../../../../fixtures/haltFixtures"
import { startedRun } from "../../../../../../fixtures/startedRun"

// --- Tests ---

describe("HospitalHalt", () => {
    test("each character healed, then given the hearts it picks among a few drawn", () => {
        const run = startedRun(1)
        const [first] = run.heroes
        first.hearts[0].isEmpty = true
        const sizes = run.heroes.map(hero => hero.hearts.length)
        const offered: HeartLoot[][] = []
        class Watching extends ScriptedPlayer {
            public override offer<T>(
                title: Text, offers: readonly T[], show: (offer: T) => Shown, done: (offer: T) => void,
            ): void {
                offered.push(offers as readonly unknown[] as HeartLoot[])
                super.offer(title, offers, show, done)
            }
        }
        const halt = HOSPITAL_HALT.create(run)
        const player = new Watching(run)
        halt.start(player)
        player.play()
        expect(halt.hasImpact).toBe(true)
        const reds = first.hearts.filter(heart => heart.kind === RED_HEART)
        expect(reds.every(heart => !heart.isEmpty)).toBe(true)
        expect(offered).toHaveLength(run.heroes.length)
        run.heroes.forEach((hero, index) => {
            const hand = offered[index]
            expect(hand).toHaveLength(INVENTED_COUNTS)
            expect(new Set(hand).size).toBe(INVENTED_COUNTS)
            expect(hand.every(loot => SPENT_LOOT_HEARTS.includes(loot))).toBe(true)
            const [{ heart, count }] = hand
            expect(hero.hearts.filter(each => each.kind === heart)).toHaveLength(count)
            expect(hero.hearts).toHaveLength(sizes[index] + count)
        })
    })
})
