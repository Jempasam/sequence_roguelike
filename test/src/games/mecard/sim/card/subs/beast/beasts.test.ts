import { describe, expect, test } from "vitest"
import { SLASH } from "@game/core-src/games/mecard/sim/card/subs/attack/Slash"
import { SWEEP } from "@game/core-src/games/mecard/sim/card/subs/attack/Sweep"
import { TACKLE } from "@game/core-src/games/mecard/sim/card/subs/attack/Tackle"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { BITE } from "@game/core-src/games/mecard/sim/card/subs/beast/BeastRewrites"
import { BEAST_CARDS } from "@game/core-src/games/mecard/sim/card/subs/beast/beasts"
import { BATTERING_RAM } from "@game/core-src/games/mecard/sim/card/subs/combat/Shoves"
import { DOUBLE_DIAGONAL } from "@game/core-src/games/mecard/sim/card/subs/modifier/DoubleDiagonal"
import { AIM } from "@game/core-src/games/mecard/sim/card/subs/movement/Aim"
import { BLINK } from "@game/core-src/games/mecard/sim/card/subs/movement/Blink"
import { BOUNCE_DASH } from "@game/core-src/games/mecard/sim/card/subs/movement/BounceDash"
import { LASSO } from "@game/core-src/games/mecard/sim/card/subs/movement/HookCard"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { STUNNING_DASH } from "@game/core-src/games/mecard/sim/card/subs/movement/StunningDash"
import { WAIT } from "@game/core-src/games/mecard/sim/card/subs/movement/Wait"
import { BLEED, WEAKENING_BLOWS } from "@game/core-src/games/mecard/sim/card/subs/status/StatusCards"
import {
    SPIRIT_ANCHOR,
    SPIRIT_PROJECTION,
} from "@game/core-src/games/mecard/sim/card/subs/summon/SpiritCards"
import { BLUE_HEART } from "@game/core-src/games/mecard/sim/heart/subs/BlueHeartKind"
import { PINK_HEART } from "@game/core-src/games/mecard/sim/heart/subs/PinkHeartKind"
import type { BeastHearts, BodyPart } from "@game/core-src/games/mecard/sim/card/CardType"

// --- Fixtures ---

/** What a beast is told by: its run, its bite, its hearts and its body, the cards by their names. */
function shape(name: string): { run: unknown, bite: unknown, hearts: BeastHearts[], body: BodyPart[] } {
    const card = BEAST_CARDS.find(each => each.beast.name === name)
    if(!card) throw new Error(`No beast is named ${name}.`)
    const { run, bite, hearts, body } = card.beast
    return { run, bite, hearts: [...hearts], body: [...body] }
}

// --- Tests ---

describe("the beasts", () => {
    test("the wolf → aims, runs, bites twice", () => {
        expect(shape("Loup")).toMatchObject({ run: [BOUNCE_DASH], bite: [BLEED, SLASH], body: [AIM, "run", "bite", "bite"] })
    })

    test("the hawk → aims and runs twice, then aims and bites", () => {
        expect(shape("Faucon")).toMatchObject({ run: [BLINK], body: [AIM, "run", AIM, "run", AIM, "bite"] })
    })

    test("the bear → aims, waits, bites, waits, runs", () => {
        expect(shape("Ours")).toMatchObject({
            run: [STEP, WAIT], bite: [AIM, WAIT, SLASH, SWEEP], body: [AIM, WAIT, "bite", WAIT, "run"],
            hearts: [{ kind: BLUE_HEART, count: 4 }, { kind: PINK_HEART, count: 1 }],
        })
    })

    test("the fox → aims, projects its spirit, runs, bites", () => {
        expect(shape("Renard")).toMatchObject({
            run: [SPIRIT_ANCHOR, STEP], bite: [AIM, THRUST], body: [AIM, SPIRIT_PROJECTION, "run", "bite"],
        })
    })

    test("the boar → runs with a stunning dash, bites with a double diagonal thrust, three blue hearts", () => {
        expect(shape("Sanglier")).toMatchObject({
            run: [STUNNING_DASH], bite: [DOUBLE_DIAGONAL, THRUST], hearts: [{ kind: BLUE_HEART, count: 3 }],
            body: ["run", AIM, "bite"],
        })
    })

    test("the ram → a battering ram, weakening blows, three blue hearts, waits then aims", () => {
        expect(shape("Bélier sauvage")).toMatchObject({
            run: [BATTERING_RAM], bite: [WEAKENING_BLOWS], hearts: [{ kind: BLUE_HEART, count: 3 }],
            body: [WAIT, AIM, "run", "bite"],
        })
    })

    test("the frog → a blink, a lasso and a tackle, two blue hearts, aims, lassoes, bites", () => {
        expect(shape("Grenouille")).toMatchObject({
            run: [BLINK], bite: [LASSO, TACKLE], hearts: [{ kind: BLUE_HEART, count: 2 }], body: [AIM, LASSO, "bite"],
        })
    })

    test("every beast card → a card giving a beast, taking nothing", () => {
        expect(BEAST_CARDS).toHaveLength(7)
        for(const card of BEAST_CARDS) expect(card.input).toBeNull()
        expect(BITE.input).toBe(BEAST_CARDS[0].output)
    })
})
