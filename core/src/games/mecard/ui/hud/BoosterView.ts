import type { Assets, ImagePath } from "../../../../engine/assets"
import { Atlas } from "../../../../engine/atlas"
import type { Gpu } from "../../../../engine/gpu"
import { Box, Container, Label, NineSlice, Panel, sizeHint, Stack } from "../../../../engine/ui"
import type { Component, SizeHint, Theme } from "../../../../engine/ui"
import type { Booster } from "../../sim/catalog/boosters"
import { boosterSize } from "../../sim/catalog/boosters"
import { engineColor } from "../look/colors"
import { TEXT_OUTLINE } from "../look/theme"
import { CARD_LOOKS, CardView } from "./CardView"
import { Color } from "../../../../engine/math"

/** The picture of the pocket of a booster: the front of a leather pocket, opaque, open on its top. */
const BOOSTER_PICTURE: ImagePath = "mecard/hud/booster.png"

/** The edge of the pocket in the picture that stays as it is when stretched, in texels, drawn 1:1. */
const MARGIN = 9

/** How tall the pocket is, in virtual pixels: the lower part of the card, whose top shows over it. */
const POCKET_HEIGHT = 45

/** How tall the pocket is while it is flattened, in virtual pixels, and how fast it flattens, per second. */
const FLAT_HEIGHT = 16
const FLATTEN_RATE = 14

/** How many cards lie under the icon, and how much of each shows above the next, in virtual pixels. */
const UNDER_CARDS = 3
const UNDER_STEP = 3

/** The space between the count and the corner of the pocket, in virtual pixels. */
const COUNT_INSET = 6

const COUNT_COLOR = new Color(1, 1, 1)

/**
 * The leather pocket of a booster, stretched over the lower part of its icon, its edges drawn as they are.
 *
 * @throws {@link AssetError} When its picture cannot be loaded.
 */
export async function loadBoosterFrame(gpu: Gpu, assets: Assets): Promise<NineSlice> {
    const atlas = new Atlas(gpu, { initialSize: 32 })
    const sprite = atlas.sprite(atlas.addAll([{ pixels: await assets.image(BOOSTER_PICTURE) }])[0])
    const margins = { left: MARGIN, top: MARGIN, right: MARGIN, bottom: MARGIN }
    return new NineSlice(sprite, margins, { opaqueCenter: true })
}

/**
 * The pocket laid over a card: as tall as {@link POCKET_HEIGHT}, flattened to {@link FLAT_HEIGHT} while it or
 * what holds it is under the pointer, to show more of the card in it, the height easing from one to the other.
 */
class Pocket extends Panel {


    constructor(theme: Theme, frame: NineSlice){
        super(theme, { background: frame, padding: 0, interactive: false })
    }


    /** It is as tall as it is now, in whole pixels, and takes the width it is given: no minimum to squeeze. */
    protected override computeHint(): SizeHint {
        const height = Math.round(this.#height)
        return sizeHint(0, height, 0, height)
    }

    protected override arranged(): void {
        super.arranged()
        this.ticking = true
    }

    protected override tick(dt: number): void {
        const goal = this.#underPointer() ? FLAT_HEIGHT : POCKET_HEIGHT
        const before = Math.round(this.#height)
        this.#height += (goal - this.#height) * Math.min(1, FLATTEN_RATE * dt)
        if(Math.abs(goal - this.#height) < 0.25) this.#height = goal
        if(Math.round(this.#height) !== before) this.invalidateLayout()
    }


    #height = POCKET_HEIGHT

    /**
     * Is it or one of its ancestors the component under the pointer, up to the first that holds the pointer
     * whole, such as an option of a choice? What is above it, a panel or the choice itself, says nothing of it.
     */
    #underPointer(): boolean {
        for(let node: Component|null = this; node; node = node.parent){
            if(node.hovered) return true
            if(node instanceof Container && node.holdsPointer) return false
        }
        return false
    }
}

/**
 * A booster as it is offered: its name in its color, and under it the card that pictures it, standing in a
 * leather pocket open on its top, and the count of its cards on the pocket, in its lower right corner,
 * white outlined in black.
 *
 * @param frame - The pocket of {@link loadBoosterFrame}, none before it is loaded: the icon is then bare.
 */
export function boosterView(theme: Theme, booster: Booster, frame: NineSlice|null): Component {
    const column = new Box("column", { gap: 2, align: "center" })
    column.add(new Label(theme, booster.name, { color: engineColor(booster.color), outline: TEXT_OUTLINE }))
    const stack = new Stack()
    // Cards under the icon, their tops showing over it: a stack of cards in the pocket.
    const icon = new CardView(theme, booster.icon, "hand")
    const { height } = CARD_LOOKS.hand
    // An icon holding cards is wider than a card, and an option is posed: it must not get less than it asks.
    const width = Math.max(CARD_LOOKS.hand.width, icon.measure(Infinity).preferredWidth)
    stack.fixedSize = { width, height: height + UNDER_STEP * UNDER_CARDS }
    for(let under = 0; under < UNDER_CARDS; under++){
        stack.add(new CardView(theme, null, "hand"), { x: "start", y: "start", offsetY: under * UNDER_STEP })
    }
    stack.add(icon, { x: "start", y: "end" })
    if(frame) stack.add(new Pocket(theme, frame), { x: "stretch", y: "end" })
    const count = new Label(theme, `${boosterSize(booster)}`, { color: COUNT_COLOR, outline: TEXT_OUTLINE })
    stack.add(count, { x: "end", y: "end", offsetX: COUNT_INSET, offsetY: COUNT_INSET })
    column.add(stack)
    return column
}
