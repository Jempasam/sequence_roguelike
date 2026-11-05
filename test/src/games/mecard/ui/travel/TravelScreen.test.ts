import { describe, expect, test } from "vitest"
import { AssetError } from "@game/core"
import type { Assets } from "@game/core"
import { isHalt, Run } from "@game/core/mecard"
import { TravelScreen } from "@game/core/mecard/travel-screen"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** Pictures that never load: the map then shows its panels and its codes, as it does while they load. */
const NO_ASSETS = {
    image: (path: string) => Promise.reject(new AssetError(path, "unreadable", "none in the tests")),
} as unknown as Assets

/** Units with no pictures. */
const NO_SPRITES = {
    of: () => null,
    whenLoaded: () => {},
} as unknown as ConstructorParameters<typeof TravelScreen>[4]

/** A screen on the map of a new run, and the ways in it was asked to play, by the arrival of each. */
interface Shown {
    readonly setup: UiSetup
    readonly run: Run
    readonly screen: TravelScreen
    readonly enters: (() => void)[]
}

function shown(): Shown {
    const setup = uiSetup({}, 620, 348)
    const run = new Run(1)
    const enters: (() => void)[] = []
    const host = { run, enter: (_: unknown, arrive: () => void) => enters.push(arrive), report: () => {} }
    const screen = new TravelScreen(setup.theme, setup.ui, host, NO_ASSETS, NO_SPRITES)
    screen.follow(run.travel)
    screen.showMap()
    setup.ui.render()
    return { setup, run, screen, enters }
}

/** Let the screen play for a while, frame after frame. */
function play({ setup, screen }: Shown, seconds: number, step = 1 / 60): void {
    for(let left = seconds; left > 1e-9; left -= step){
        const dt = Math.min(step, left)
        screen.frame(setup.frame(), dt)
        setup.ui.update(dt)
        setup.ui.render()
    }
}

// --- Tests ---

describe("TravelScreen", () => {
    test("a place gone to → the party slides there first, then the transition plays, once", () => {
        const game = shown()
        const { run, screen, enters } = game
        screen.go(run.travel.next[0])
        expect(run.travel.phase).toBe("entering")
        play(game, 0.3)
        expect(enters).toHaveLength(0)
        play(game, 0.3)
        expect(enters).toHaveLength(1)
        play(game, 1)
        expect(enters).toHaveLength(1)
    })

    test("built again on its way → the party goes on from where it stood", () => {
        const game = shown()
        const { setup, run, screen, enters } = game
        screen.go(run.travel.next[0])
        play(game, 0.3)
        screen.refresh()
        setup.ui.render()
        play(game, 0.3)
        expect(enters).toHaveLength(1)
    })

    test("another place asked on its way → the party keeps going where it goes", () => {
        const game = shown()
        const { run, screen, enters } = game
        const [first, second] = run.travel.next
        screen.go(first)
        screen.go(second)
        play(game, 0.6)
        expect(run.travel.place).toBe(first)
        expect(enters).toHaveLength(1)
    })

    test("back into the halt it stands on → nothing moved, so the transition plays at the next frame", () => {
        const game = shown()
        const { run, screen, enters } = game
        const halt = run.travel.journey.places.find(place => isHalt(place.kind) && !place.exitTo)
        if(!halt) throw new Error("The map holds no halt.")
        run.travel.jump(halt)
        run.travel.haltOf(halt)
        expect(run.travel.returnable).toBe(halt)
        play(game, 0.6)
        screen.go(halt)
        play(game, 1 / 60)
        expect(enters).toHaveLength(1)
    })

    test("shown again on its way → the party is there, and the transition is not lost", () => {
        const game = shown()
        const { run, screen, enters } = game
        screen.go(run.travel.next[0])
        play(game, 0.2)
        screen.showMap()
        expect(enters).toHaveLength(1)
    })

    test("a new travel followed on its way → what was going on is dropped", () => {
        const game = shown()
        const { run, screen, enters } = game
        screen.go(run.travel.next[0])
        play(game, 0.2)
        screen.follow(new Run(2).travel)
        play(game, 1)
        expect(enters).toHaveLength(0)
    })

    test("entered, then back on the map → the party stands on its place, the next ones open", () => {
        const game = shown()
        const { setup, run, screen, enters } = game
        const place = run.travel.next[0]
        screen.go(place)
        play(game, 0.6)
        enters[0]()
        run.backToMap()
        screen.showMap()
        setup.ui.render()
        expect(run.travel.place).toBe(place)
        screen.go(run.travel.next[0])
        expect(run.travel.place?.layer).toBe(place.layer + 1)
    })
})
