import { describe, expect, test } from "vitest"
import { Forwarded } from "@game/core/mecard/forwarded"
import { RunParticleLink } from "@game/core/mecard/run-particle-link"
import { ParticleOverlay } from "@game/core/mecard/particle-overlay"
import { settle, uiSetup } from "../../../../fixtures/uiFixtures"
import { startedRun } from "../../../../fixtures/startedRun"

describe("ParticleOverlay", () => {
    test("mounted in a layer, with particles emitted → they play out as the interface updates", () => {
        const setup = uiSetup()
        const run = startedRun(1)
        const forwarded = new Forwarded(error => { throw error })
        const link = new RunParticleLink(run, forwarded, () => null)
        const at = { x: 40, y: 50 }
        link.context = {
            unitPosition: () => at,
            heartsOf: () => at,
            feetOf: () => at,
            goldCounter: () => null,
            deckPile: () => at,
            heroPortrait: () => at,
            placePosition: () => at,
            pointer: () => at,
            center: () => at,
            size: () => ({ width: 320, height: 180 }),
        }
        setup.main.content.add(new ParticleOverlay(link), { x: "stretch", y: "stretch" })
        settle(setup.ui)
        forwarded.forward(run.heroJoined, run.heroes[0], "start")
        const emitted = link.additive.count
        expect(emitted).toBeGreaterThan(0)
        for(let step = 0; step < 1000 && link.active; step++){
            setup.ui.update(0.05)
            setup.ui.render()
        }
        expect(link.active).toBe(false)
    })
})
