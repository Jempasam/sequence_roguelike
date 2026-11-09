import { describe, expect, test } from "vitest"
import {
    AIM, BACK_DASH, GOBLIN, Heart, planFor, RED_HEART, STEP, TURNS, Vector2,
} from "@game/core/mecard"

import { battle, MONSTERS, started, unit } from "../fixtures"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Tests ---

describe("Deck, ordered", () => {
    test("drawn in order, the discard back under in the order played → the same loop again", () => {
        const on = battle()
        const bot = on.add({
            name: "bot", team: MONSTERS, controller: "bot", position: new Vector2(3, 0), direction: Vector2.DOWN,
            hearts: Heart.many(RED_HEART, 2), decks: [[AIM, STEP, TURNS[4], BACK_DASH]],
            bases: { draw: 2, firstDraw: 2, ordered: true },
        })
        unit(on, 0, 6)
        const hands: string[] = []
        for(let round = 0; round < 3; round++){
            on.startRound()
            hands.push(bot.hand.map(card => card.name).join(", "))
            on.commit(bot, planFor(bot))
            on.endPreparation()
            on.playRound()
        }
        expect(hands).toEqual(["Viser, Avancer", "Tourner, Dash arrière", "Viser, Avancer"])
    })

    test("a goblin → plays each round of its deck in turn", () => {
        const run = startedRun(1)
        const fight = started(run)
        const goblin = fight.units.find(candidate => candidate.name.startsWith(GOBLIN.name))
        if(!goblin) throw new Error("The first floor has no goblin.")
        expect(goblin.hand).toEqual(GOBLIN.cards.slice(0, GOBLIN.draw))
    })
})
