import type { Assets, ImagePath } from "../../../../engine/assets"
import { Atlas } from "../../../../engine/atlas"
import type { Gpu, Painter, Sprite } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { TextLayout } from "../../../../engine/text"
import { Component, NineSlice, Rope, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme, UiEvent } from "../../../../engine/ui"
import { FLOOR_TYPES } from "../../sim/catalog/floors"
import type { Decoration } from "../../sim/floor/Floor"
import type { Journey, Place } from "../../sim/run/Journey"

import { PAPER_PATH, PATH_PICTURE, paperFrame, SHADE_PICTURE } from "../look/paper"
import { TEXT_OUTLINE } from "../look/theme"
import { PLACE_LOOKS } from "./placeLooks"
import { scatter } from "./scatter"
import type { ScatteredPiece } from "./scatter"
import type { ShownParty } from "./ShownParty"

/** The whole factor the logos of the places are drawn at. */
const LOGO_SCALE = 2

/** The size of a token of a place, in virtual pixels: a logo at its scale, and a little room. */
const TOKEN_WIDTH = 13 * LOGO_SCALE + 2
const TOKEN_HEIGHT = 13 * LOGO_SCALE + 2

/** How far apart two rows of the map are, from middle to middle, in virtual pixels. */
const ROW_STEP = TOKEN_HEIGHT + 6

/** The room kept over the start for the party standing on it, in virtual pixels. */
const PARTY_ROOM = 14

/** The width the map asks for, in virtual pixels: it takes whatever width its screen gives it. */
const PREFERRED_WIDTH = 160

/** How thick a path is drawn, in virtual pixels: its picture, or a plain line while it is not loaded. */
const ROPE_WIDTH = 4
const OPEN_ROPE_WIDTH = 6
const PATH_WIDTH = 1
const OPEN_PATH_WIDTH = 2

/** The whole factor the paper of the map is drawn at. */
const PAPER_SCALE = 2

/** The picture of the circle drawn under the place hovered. */
const CIRCLE: ImagePath = "mecard/travel/map/circle.png"

/** The whole factor what lies under a place is drawn at. */
const UNDER_SCALE = 2

const PATH = new Color(0.3, 0.2, 0.13)
const OPEN_PATH = new Color(0.72, 0.13, 0.08)
const HOVERED_CIRCLE = new Color(0.1, 0.07, 0.05)
const NO_TINT = new Color(1, 1, 1)

/** How what lies on the map is drawn: faded into the paper, so it is not taken for a place. */
const DECORATION_TINT = new Color(1, 1, 1, 0.45)

/** How many times larger than the text of the interface the code of a place is drawn. */
const CODE_SCALE = 3

/** How thick the outline of the code of a place is, in virtual pixels. */
const CODE_OUTLINE = 2

/** How much darker a place the party can no more go to is drawn. */
const BEHIND = 0.45

/** What the start says, below the first layer, where the party stands before it goes anywhere. */
const START_CODE = "D"

/** How far below the middle of a token the feet of the party stand, in virtual pixels. */
const PARTY_FEET = 4

/** What the map is drawn with, loaded together. */
export interface MapArt {
    /** The logos of the places and the icons of the floors, by their picture. */
    readonly logos: ReadonlyMap<ImagePath, Sprite>

    /** What lies on the maps of the floors, by its picture. */
    readonly decorations: ReadonlyMap<ImagePath, Sprite>

    /** The look of a path between two places. */
    readonly path: Rope

    /** The darker spot under a place. */
    readonly shade: Sprite

    /** The circle drawn under the place hovered. */
    readonly circle: Sprite

    /** The worn paper the map lies on, repeating so its edges keep their grain at any size. */
    readonly paper: NineSlice
}

/**
 * The map of a floor, drawn from the start at the bottom, through each layer, to the exits at the top: a
 * token for each place, its logo alone or its code in large outlined letters, over a darker spot, and the
 * paths between them, over what lies around for the look of it. A circle drawn under a place tells it is
 * hovered.
 * The paths to the places the party may go to are lit; a click on one goes there, and the hover of any is
 * told. The party stands where it is, its characters side by side: on the start until it goes
 * anywhere, sliding along the paths as its {@link ShownParty} goes.
 */
export class JourneyView extends Component {


    /** What a click on a place the party may go to does, nothing when none. */
    public onPick: ((place: Place) => void)|null = null

    /** What the pointer coming over a place or leaving all does, nothing when none. */
    public onHover: ((place: Place|null) => void)|null = null

    /**
     * What the map is drawn with, in one atlas.
     *
     * @throws {@link AssetError} When a picture cannot be loaded.
     */
    public static async loadArt(gpu: Gpu, assets: Assets): Promise<MapArt> {
        const logos = [...new Set([
            ...Object.values(PLACE_LOOKS).flatMap(({ icon }) => icon ? [icon] : []),
            ...FLOOR_TYPES.map(({ icon }) => icon),
        ])]
        const pieces = FLOOR_TYPES.flatMap(type => type.decorations)
        const decorations = [...new Set(pieces.map(each => each.picture))]
        const paths = [PAPER_PATH, PATH_PICTURE, SHADE_PICTURE, CIRCLE, ...logos, ...decorations]
        const pictures = await Promise.all(paths.map(path => assets.image(path)))
        const atlas = new Atlas(gpu, { initialSize: 64 })
        const entries = atlas.addAll(pictures.map(pixels => ({ pixels })))
        const [paper, path, shade, circle, ...sprites] = entries.map(entry => atlas.sprite(entry))
        return {
            logos: new Map(logos.map((logo, index) => [logo, sprites[index]])),
            decorations: new Map(decorations.map((each, index) => [each, sprites[logos.length + index]])),
            path: new Rope(path),
            shade,
            circle,
            paper: paperFrame(paper, PAPER_SCALE),
        }
    }

    constructor(
        public readonly theme: Theme,
        public readonly journey: Journey,

        /** Where the party is shown, which whoever replays the journey moves. */
        public readonly shown: ShownParty,

        /** The places the party may go to. */
        public readonly open: readonly Place[],

        /** What may lie on the map, between the places. */
        public readonly decorations: readonly Decoration[],
    ){
        super()
        this.#codes = new TextLayout(theme.font, theme.textScale * CODE_SCALE)
    }


    /** What it is drawn with, none while it loads: then places show their codes, and paths plain lines. */
    public get art(): MapArt|null { return this.#art }

    public set art(art: MapArt|null){
        this.#art = art
        this.invalidate()
    }

    /** The sprites of the characters of the party, in order, drawn side by side where it stands. */
    public get party(): readonly Sprite[] { return this.#party }

    public set party(party: readonly Sprite[]){
        this.#party = party
        this.invalidate()
    }


    /** The place the party stands on or leaves, none before the first layer. */
    public get here(): Place|null { return this.shown.here }


    protected override get interactive(): boolean { return true }

    protected computeHint(): SizeHint {
        const height = TOKEN_HEIGHT + this.journey.layers.length * ROW_STEP + PARTY_ROOM
        return sizeHint(PREFERRED_WIDTH, height)
    }

    /**
     * Where the row the party stands on ends, its bottom, in the coordinates of the map: a scroll holding
     * the map brings it into view.
     */
    public partyRowBottom(): number {
        return this.#tokenCenter(this.here).y + Math.ceil(TOKEN_HEIGHT / 2)
    }

    protected paint(painter: Painter): void {
        painter.push()
        painter.setWhitePixel(this.theme.white)
        this.#paintDecorations(painter)
        for(const { from, to } of this.#links()){
            // From an exit, the paths of the others are lit: the party may still take them.
            const leaving = from === this.here || this.here?.exitTo
            const lit = Boolean(leaving) && this.open.includes(to)
            this.#paintPath(painter, this.#tokenCenter(from), this.#center(to), lit)
        }
        this.#paintStart(painter)
        for(const layer of this.journey.layers) for(const place of layer) this.#paintToken(painter, place)
        this.#paintParty(painter, this.#partyCenter())
        painter.pop()
    }

    protected override handle(event: UiEvent): void {
        if(event.type === "pointer-move"){
            this.#hover(this.#placeAt(event.x, event.y))
            return
        }
        if(event.type !== "pointer-down" || event.button !== 0) return
        const place = this.#placeAt(event.x, event.y)
        if(!place || !this.open.includes(place)) return
        event.consume()
        this.onPick?.(place)
    }

    protected override hoverChanged(): void {
        if(!this.hovered) this.#hover(null)
    }


    /** Lays out the codes of the places. */
    readonly #codes: TextLayout
    #art: MapArt|null = null
    #party: readonly Sprite[] = []

    /** The place the pointer is over, none when none. */
    #hovered: Place|null = null

    /** What lies on the map, and the size of the map it was laid for. */
    #scattered: { readonly size: string, readonly pieces: readonly ScatteredPiece[] }|null = null

    #hover(place: Place|null): void {
        if(place === this.#hovered) return
        this.#hovered = place
        this.invalidate()
        this.onHover?.(place)
    }

    /** What lies on the map, at its size, laid again only when that changes. */
    #piecesLaid(): readonly ScatteredPiece[] {
        const { width, height } = this.bounds
        const size = `${width}×${height}`
        if(this.#scattered?.size === size) return this.#scattered.pieces
        const sizes = this.decorations.map(({ picture, size: scale }) => {
            const sprite = this.#art?.decorations.get(picture)
            return { width: (sprite?.width ?? 0) * scale, height: (sprite?.height ?? 0) * scale }
        })
        const places = this.journey.layers.flat().map(place => this.#center(place))
        const tokens = [this.#startCenter(), ...places]
        const paths = this.#links().map(({ from, to }) => ({ from: this.#tokenCenter(from), to: this.#center(to) }))
        const pieces = scatter(this.journey.scenery, sizes, { size: { width, height }, tokens, paths })
        this.#scattered = { size, pieces }
        return pieces
    }

    /** What lies on the map, once its pictures are loaded. */
    #paintDecorations(painter: Painter): void {
        if(!this.#art) return
        painter.setTint(DECORATION_TINT)
        for(const { piece, x, y } of this.#piecesLaid()){
            const { picture, size } = this.decorations[piece]
            const sprite = this.#art.decorations.get(picture)
            if(!sprite) continue
            painter.push()
            painter.translate(x, y)
            painter.scale(size)
            painter.sprite(sprite, 0, 0)
            painter.pop()
        }
    }

    /** The paths of the map, each from a place, none for the start, to the next. */
    #links(): readonly { readonly from: Place|null, readonly to: Place }[] {
        const first = this.journey.entries.map(to => ({ from: null, to }))
        const others = this.journey.layers.flat().flatMap(from => from.next.map(to => ({ from, to })))
        return [...first, ...others]
    }

    /** Where the token of a place lies, its center, in the coordinates of the map. */
    #center(place: Place): { readonly x: number, readonly y: number } {
        return this.#at(place.layer + 1, place.across)
    }

    /** Where the token of a place, or the start when none, lies, its center. */
    #tokenCenter(place: Place|null): { readonly x: number, readonly y: number } {
        return place ? this.#center(place) : this.#startCenter()
    }

    /** Where the start lies, its center: a row below the first layer, in the middle. */
    #startCenter(): { readonly x: number, readonly y: number } {
        return this.#at(0, 0.5)
    }

    /**
     * Where a token lies, its center, from its row, the start's from the bottom, and how far across it is,
     * from 0 to 1.
     */
    #at(row: number, across: number): { readonly x: number, readonly y: number } {
        const { width, height } = this.bounds
        const x = TOKEN_WIDTH / 2 + across * (width - TOKEN_WIDTH)
        return { x: Math.round(x), y: Math.round(height - TOKEN_HEIGHT / 2 - row * ROW_STEP) }
    }

    /** A path between two points, in its picture once loaded, lit when the party may take it. */
    #paintPath(
        painter: Painter, from: { readonly x: number, readonly y: number },
        to: { readonly x: number, readonly y: number }, lit: boolean,
    ): void {
        painter.setTint(lit ? OPEN_PATH : PATH)
        const rope = this.#art?.path
        if(rope) rope.draw(painter, from, to, lit ? OPEN_ROPE_WIDTH : ROPE_WIDTH)
        else painter.thickLine(from, to, lit ? OPEN_PATH_WIDTH : PATH_WIDTH)
    }

    /** The start: its code, dimmed once the party left it. */
    #paintStart(painter: Painter): void {
        const { x, y } = this.#startCenter()
        if(this.#art) this.#paintUnder(painter, this.#art.shade, x, y, NO_TINT)
        this.#paintCode(painter, START_CODE, x, y, this.here === null ? 1 : BEHIND)
    }

    /** Where the party is now: on its token, or along its path, easing in and out, to the pixel. */
    #partyCenter(): { readonly x: number, readonly y: number } {
        const from = this.#tokenCenter(this.here)
        const { walk } = this.shown
        if(!walk) return from
        const to = this.#center(walk.to)
        const t = walk.share
        const eased = t * t * (3 - 2 * t)
        return {
            x: Math.round(from.x + (to.x - from.x) * eased),
            y: Math.round(from.y + (to.y - from.y) * eased),
        }
    }

    /** The characters of the party side by side, their feet just under the middle of where it stands. */
    #paintParty(painter: Painter, at: { readonly x: number, readonly y: number }): void {
        const party = this.#party
        if(party.length === 0) return
        const width = party.reduce((sum, sprite) => sum + sprite.width, 0)
        let left = Math.round(at.x - width / 2)
        painter.setTint(new Color(1, 1, 1))
        for(const sprite of party){
            painter.sprite(sprite, left, at.y + PARTY_FEET - sprite.height)
            left += sprite.width
        }
    }

    /** The place whose token a point of the map lies on, none when none. */
    #placeAt(x: number, y: number): Place|null {
        for(const layer of this.journey.layers){
            for(const place of layer){
                const center = this.#center(place)
                const across = Math.abs(x - center.x) <= TOKEN_WIDTH / 2
                const along = Math.abs(y - center.y) <= TOKEN_HEIGHT / 2
                if(across && along) return place
            }
        }
        return null
    }

    #paintToken(painter: Painter, place: Place): void {
        const { x, y } = this.#center(place)
        const open = this.open.includes(place)
        const passed = this.here !== null && place.layer <= this.here.layer && place !== this.here && !open
        const shade = passed ? BEHIND : 1
        const art = this.#art
        const icon = place.exitTo?.type.icon ?? PLACE_LOOKS[place.kind].icon
        const logo = icon && art?.logos.get(icon)
        if(art) this.#paintUnder(painter, art.shade, x, y, NO_TINT)
        if(art && place === this.#hovered){
            const circle = open ? OPEN_PATH : HOVERED_CIRCLE
            this.#paintUnder(painter, art.circle, x, y, circle)
        }
        if(!logo){
            this.#paintCode(painter, PLACE_LOOKS[place.kind].code, x, y, shade)
            return
        }
        painter.setTint(new Color(shade, shade, shade))
        painter.push()
        const logoLeft = x - Math.floor(logo.width * LOGO_SCALE / 2)
        painter.translate(logoLeft, y - Math.floor(logo.height * LOGO_SCALE / 2))
        painter.scale(LOGO_SCALE)
        painter.sprite(logo, 0, 0)
        painter.pop()
    }

    /**
     * The code of a place, white outlined in black, centered on a point.
     *
     * @param shade - How bright its white is, from 0 to 1.
     */
    #paintCode(painter: Painter, code: string, x: number, y: number, shade: number): void {
        const text = this.#codes
        const left = x - Math.floor(text.widthOf(code) / 2)
        const top = y - Math.floor(text.lineHeight / 2)
        const color = new Color(shade, shade, shade)
        text.drawOutlined(painter, code, left, top, color, TEXT_OUTLINE, CODE_OUTLINE)
    }

    /** A picture lying under a place, centered on a point. */
    #paintUnder(painter: Painter, picture: Sprite, x: number, y: number, tint: Color): void {
        painter.setTint(tint)
        painter.push()
        painter.translate(x - picture.width * UNDER_SCALE / 2, y - picture.height * UNDER_SCALE / 2)
        painter.scale(UNDER_SCALE)
        painter.sprite(picture, 0, 0)
        painter.pop()
    }
}
