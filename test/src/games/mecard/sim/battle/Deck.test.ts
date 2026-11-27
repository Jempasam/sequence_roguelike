import { describe, expect, test } from "vitest"
import { DeckAi } from "@game/core-src/games/mecard/sim/ai/Bot"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { AIM } from "@game/core-src/games/mecard/sim/card/subs/movement/Aim"
import { BACK_DASH } from "@game/core-src/games/mecard/sim/card/subs/movement/BackDash"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { TURNS } from "@game/core-src/games/mecard/sim/card/subs/movement/TurnCard"
import { GOBLIN } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { BATTLE } from "@game/core-src/games/mecard/sim/fight/fights"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"

import { battle, MONSTERS, unit } from "../fixtures"
import { fightOf } from "../../../../fixtures/fightFixtures"
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
            on.commit(bot, new DeckAi().decide(bot).chain)
            on.endPreparation()
            on.playRound()
        }
        expect(hands).toEqual(["Viser, Avancer", "Tourner, Dash arrière", "Viser, Avancer"])
    })

    test("a goblin → plays each round of its deck in turn", () => {
        const fight = fightOf(BATTLE, GOBLIN).create(startedRun(1), { layer: 0, across: 0.5 }).battle
        fight.startRound()
        const goblin = fight.units.find(candidate => candidate.name.startsWith(GOBLIN.name))
        if(!goblin) throw new Error("The fight has no goblin.")
        expect(goblin.hand).toEqual(GOBLIN.cards.slice(0, GOBLIN.draw))
    })
})
