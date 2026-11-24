import { describe, expect, test } from "vitest"
import { AssetError, Button, plainText, Tabs, WrapBox } from "@game/core"
import type { Assets, Component, Painter } from "@game/core"
import { CatalogDialog, CHEST_HALT, HeroDialog, Run, TellDialog, THRUST } from "@game/core/mecard"
import type { CatalogPick } from "@game/core/mecard"
import { CardView } from "@game/core/mecard/card-view"
import { CatalogBrowser } from "@game/core/mecard/catalog-browser"
import { JourneyView } from "@game/core/mecard/journey-view"
import { TravelScreen } from "@game/core/mecard/travel-screen"
import type { TravelScreenOptions } from "@game/core/mecard/travel-screen"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** Pictures that never load: the map then shows its panels and its codes, as it does while they load. */
const NO_ASSETS = {
    image: (path: string) => Promise.reject(new AssetError(path, "unreadable", "none in the tests")),
    layeredImage: (path: string) => Promise.reject(new AssetError(path, "unreadable", "none in the tests")),
} as unknown as Assets

/** Where a screen drawing only in the interface is given to draw. */
const NO_WORLD = null as unknown as Painter

/** Units with no pictures. */
const NO_SPRITES = {
    of: () => null,
    thing: () => null,
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
    const run = startedRun(1)
    const enters: (() => void)[] = []
    const screen = new TravelScreen(setup.ui, run.travel, {
        theme: setup.theme, assets: NO_ASSETS, sprites: NO_SPRITES,
        enter: () => new Promise(arrive => enters.push(arrive)),
        leave: () => Promise.resolve(),
        ready: () => Promise.resolve(),
        loading: work => work,
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

/** A screen whose panels are built: it reads the whole of the travel once its host is done building. */
async function builtScreen(): Promise<Shown> {
    const game = shown()
    await settled()
    // The first frame lays the panels out for the size of the interface.
    game.screen.frame(game.setup.frame(), NO_WORLD, 0)
    game.setup.ui.render()
    return game
}

/** Every component under another, itself included. */
function allUnder(root: Component): Component[] {
    const found: Component[] = [root]
    const children = (root as { children?: readonly Component[] }).children ?? []
    for(const child of children) found.push(...allUnder(child))
    return found
}

/** The components of the screen of a class. */
function ofClass<Type extends Component>(
    { setup }: Shown, kind: abstract new (...args: never[]) => Type,
): Type[] {
    const layer = setup.ui.layers.find(each => each.name === "ui")!
    return allUnder(layer.content).filter((each): each is Type => each instanceof kind)
}

/** Where the middle of a component lies on the layers. */
function middleOf(component: Component): { x: number, y: number } {
    let x = component.bounds.width / 2
    let y = component.bounds.height / 2
    for(let each: Component|null = component; each; each = each.parent){
        x += each.bounds.x
        y += each.bounds.y
    }
    return { x: Math.floor(x), y: Math.floor(y) }
}

/** Move the pointer, and let the screen read the frame. */
function pointTo({ setup, screen }: Shown, at: { x: number, y: number }): void {
    setup.port.send({ type: "pointer-move", x: at.x, y: at.y })
    screen.frame(setup.frame(), NO_WORLD, 0)
    setup.ui.render()
}

// --- Tests ---

describe("TravelScreen, what is hovered", () => {
    test("pointer over the map → a place tells its name and what it hides, and nothing between places", async() => {
        const game = await builtScreen()
        const [view] = ofClass(game, JourneyView)
        const { x: left, y: top } = middleOf(view)
        const onPlace: { x: number, y: number }[] = []
        const between: { x: number, y: number }[] = []
        const local = { x: 0, y: 0 }
        for(let y = top - view.bounds.height / 2; y < top + view.bounds.height / 2; y += 4){
            for(let x = left - view.bounds.width / 2; x < left + view.bounds.width / 2; x += 4){
                if(!view.localPoint(x, y, local)) continue
                const found = view.placeAt(local.x, local.y) !== null
                if(found) onPlace.push({ x, y })
                else between.push({ x, y })
            }
        }
        const told = onPlace.slice(0, 40).map(at => {
            pointTo(game, at)
            return game.screen.tooltip.text
        }).find(text => text !== null)
        expect(told).toBeDefined()
        expect(plainText(told!)).toContain(" : ")
        pointTo(game, between[0])
        expect(game.screen.tooltip.open).toBe(false)
    })

    test("pointer over an option of a choice → the bubble tells what the step says of it", async() => {
        const game = await builtScreen()
        const { run, screen } = game
        run.travel.heroAsked.notify(new HeroDialog("Qui ?", false, run.heroes, false))
        game.setup.ui.render()
        const layer = game.setup.ui.layers.find(each => each.name === "ui")!
        const option = allUnder(layer.content).find(each => each.constructor.name === "ChoiceOption")!
        pointTo(game, middleOf(option))
        expect(screen.tooltip.open).toBe(true)
        expect(plainText(screen.tooltip.text!)).toContain("cartes.")
        pointTo(game, { x: 0, y: 0 })
        expect(screen.tooltip.open).toBe(false)
    })

    test("a thing of the catalogue asked → its browser shows the types allowed, a click takes it", async() => {
        const game = await builtScreen()
        const { run, screen, setup } = game
        const taken: CatalogPick[] = []
        run.travel.takeCatalog = (_, pick) => { taken.push(pick) }
        const dialog = new CatalogDialog("Quel aventurier ?", false, ["kits"], new Set(["Lancier"]))
        run.travel.catalogAsked.notify(dialog)
        setup.ui.render()
        const [browser] = ofClass(game, CatalogBrowser)
        expect(browser.sections.map(section => section.title)).toEqual(["Aventuriers"])
        const wraps = allUnder(browser.list).filter(each => each instanceof WrapBox)
        const entry = wraps[wraps.length - 1].children[0]
        expect(wraps[wraps.length - 1].children).toHaveLength(1)
        const at = middleOf(entry)
        const { x, y } = at
        setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
        setup.port.send({ type: "pointer-up", button: 0, x, y })
        screen.frame(setup.frame(), NO_WORLD, 0)
        expect(taken).toEqual([{ category: "kits", key: "Lancier" }])
    })

    test("a deck shown by a dialog → hovering one of its cards opens a bubble", async() => {
        const game = await builtScreen()
        const { run, screen } = game
        run.travel.told.notify(new TellDialog("Voilà", { cards: [], decks: [[THRUST]] }))
        game.setup.ui.render()
        const view = ofClass(game, CardView).find(each => each.card === THRUST)!
        pointTo(game, middleOf(view))
        expect(screen.tooltip.open).toBe(true)
        pointTo(game, { x: 0, y: 0 })
        expect(screen.tooltip.open).toBe(false)
    })

    test("the tabs of the side changed and changed back → the cards of its deck tell again", async() => {
        const game = await builtScreen()
        const { screen } = game
        const [tabs] = ofClass(game, Tabs)
        const buttons = allUnder(tabs).filter((each): each is Button => each instanceof Button)
        buttons[1].activate()
        game.setup.ui.render()
        buttons[0].activate()
        game.setup.ui.render()
        const inTabs = new Set(allUnder(tabs))
        const view = ofClass(game, CardView).find(each => inTabs.has(each))!
        pointTo(game, middleOf(view))
        expect(screen.tooltip.open).toBe(true)
    })
})

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
        run.travel.visit(CHEST_HALT)
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
        const halt = run.travel.journey.places.find(place => !place.fight && place.halt && !place.exitTo)
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
        run.travel.visit(CHEST_HALT)
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
        screen.engine = startedRun(2).travel
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
