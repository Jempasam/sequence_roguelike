import { describe, expect, test } from "vitest"
import { AssetError } from "@game/core"
import type { Assets, Painter } from "@game/core"
import { isHalt, Run } from "@game/core/mecard"
import { TravelScreen } from "@game/core/mecard/travel-screen"
import type { TravelScreenOptions } from "@game/core/mecard/travel-screen"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** Pictures that never load: the map then shows its panels and its codes, as it does while they load. */
const NO_ASSETS = {
    image: (path: string) => Promise.reject(new AssetError(path, "unreadable", "none in the tests")),
} as unknown as Assets

/** Where a screen drawing only in the interface is given to draw. */
const NO_WORLD = null as unknown as Painter

/** Units with no pictures. */
const NO_SPRITES = {
    of: () => null,
    whenLoaded: () => {},
} as unknown as TravelScreenOptions["sprites"]

/** A screen on the map of a new run, and the ways into a halt it asked to play, by their middles. */
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
    const screen = new TravelScreen(setup.ui, run.travel, {
        theme: setup.theme, assets: NO_ASSETS, sprites: NO_SPRITES,
        enter: () => new Promise(arrive => enters.push(arrive)),
        report: () => {},
    })
    setup.ui.render()
    return { setup, run, screen, enters }
}

/** Let what the screen plays go on, each thing started once the one before is done. */
async function settled(): Promise<void> {
    for(let turn = 0; turn < 10; turn++) await Promise.resolve()
}

/** Let the screen play for a while, frame after frame. */
async function play({ setup, screen }: Shown, seconds: number, step = 1 / 60): Promise<void> {
    for(let left = seconds; left > 1e-9; left -= step){
        const dt = Math.min(step, left)
        screen.frame(setup.frame(), NO_WORLD, dt)
        await settled()
        setup.ui.update(dt)
        setup.ui.render()
    }
}

// --- Tests ---

describe("TravelScreen", () => {
    test("the map locked, then free → it shows, whatever the travel does, and takes what it did", async() => {
        const game = shown()
        const { setup, run, screen, enters } = game
        screen.locks = { map: true }
        setup.ui.render()
        run.travel.jump(run.travel.next[0])
        await play(game, 0.6)
        expect(enters).toHaveLength(0)
        screen.locks = { map: false }
        setup.ui.render()
        expect(screen.locks.map).toBe(false)
    })

    test("a place gone to → the party slides there first, then the journey goes in, once", async() => {
        const game = shown()
        const { run, screen } = game
        const entered: unknown[] = []
        run.travel.fightReached.add(place => entered.push(place))
        screen.go(run.travel.next[0])
        expect(run.travel.phase).toBe("entering")
        await play(game, 0.3)
        expect(run.travel.phase).toBe("entering")
        await play(game, 0.3)
        expect(run.travel.phase).toBe("fight")
        await play(game, 1)
        expect(entered).toHaveLength(1)
    })

    test("built again on its way → the party goes on from where it stood", async() => {
        const game = shown()
        const { setup, run, screen } = game
        screen.go(run.travel.next[0])
        await play(game, 0.3)
        screen.refresh()
        setup.ui.render()
        await play(game, 0.3)
        expect(run.travel.phase).toBe("fight")
    })

    test("another place asked on its way → the party keeps going where it goes", async() => {
        const game = shown()
        const { run, screen } = game
        const [first, second] = run.travel.next
        screen.go(first)
        screen.go(second)
        await play(game, 0.6)
        expect(run.travel.place).toBe(first)
    })

    test("a halt told by the journey → its way in played, once, the screen held until its middle", async() => {
        const game = shown()
        const { run, screen, enters } = game
        run.travel.visit("chest")
        expect(run.travel.phase).toBe("visit")
        await play(game, 1)
        expect(enters).toHaveLength(1)
        expect(screen.animations.busy).toBe(true)
        enters[0]()
        await settled()
        expect(screen.animations.busy).toBe(false)
        expect(enters).toHaveLength(1)
    })

    test("back into the halt it stands on → nothing moved, so the way in plays at once", async() => {
        const game = shown()
        const { run, screen, enters } = game
        const halt = run.travel.journey.places.find(place => isHalt(place.kind) && !place.exitTo)
        if(!halt) throw new Error("The map holds no halt.")
        run.travel.jump(halt)
        run.travel.haltOf(halt)
        expect(run.travel.returnable).toBe(halt)
        await play(game, 0.6)
        screen.go(halt)
        await play(game, 1 / 60)
        expect(enters).toHaveLength(1)
    })

    test("left during its way in → back on the map, nothing held", async() => {
        const game = shown()
        const { run, screen, enters } = game
        run.travel.visit("chest")
        await play(game, 1 / 60)
        run.travel.leave()
        enters[0]()
        await settled()
        expect(run.travel.phase).toBe("map")
        expect(screen.animations.busy).toBe(false)
    })

    test("shown again on its way → the party is there, and the journey still goes in", async() => {
        const game = shown()
        const { run, screen } = game
        screen.go(run.travel.next[0])
        await play(game, 0.2)
        screen.showMap()
        await settled()
        expect(run.travel.phase).toBe("fight")
    })

    test("a new travel given on its way → what was going on is dropped", async() => {
        const game = shown()
        const { run, screen } = game
        screen.go(run.travel.next[0])
        await play(game, 0.2)
        screen.engine = new Run(2).travel
        await play(game, 1)
        expect(run.travel.phase).toBe("entering")
    })

    test("entered, then back on the map → the party stands on its place, the next ones open", async() => {
        const game = shown()
        const { setup, run, screen } = game
        const place = run.travel.next[0]
        screen.go(place)
        await play(game, 0.6)
        run.backToMap()
        screen.showMap()
        setup.ui.render()
        expect(run.travel.place).toBe(place)
        screen.go(run.travel.next[0])
        expect(run.travel.place?.layer).toBe(place.layer + 1)
    })
})
