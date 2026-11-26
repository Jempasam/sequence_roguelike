import { Atlas } from "../../../../engine/atlas"
import { AssetError } from "../../../../engine/assets"
import type { Assets, ImagePath } from "../../../../engine/assets"
import type { Gpu, Sprite } from "../../../../engine/gpu"
import type { TextPicture } from "../../../../engine/text"
import { ALL_ITEMS, ALL_USABLES } from "../../sim/catalog"
import { allHalts } from "../../sim/catalog/halts"
import { ALL_FLOORS } from "../../sim/catalog/floors"
import type { StatusType } from "../../sim/status/Status"
import { STATUS_FAMILIES, STATUS_TYPES } from "../../sim/status/statusTypes"
import { Rope } from "../../../../engine/ui"
import type { NineSlice } from "../../../../engine/ui"
import { BagView } from "../hud/BagView"
import { loadBoosterFrame } from "../hud/BoosterView"
import { visual } from "../../sim/base/Visual"
import type { Visual } from "../../sim/base/Visual"
import { PAPER_PATH, PATH_PICTURE, SHADE_PICTURE } from "./paper"
import { loadWood } from "./wood"
import type { Wood } from "./wood"
import { DEFAULT_LOOK, readSpriteLook } from "./spriteLook"
import type { SpriteLook } from "./spriteLook"
import { dataPathOf, FX_ROOT, loadPictures, shippedPictures } from "./visualPath"

/** The giant floating hand standing for a party of none on the map: it is no unit, so no kit names it. */
export const HAND_VISUAL: Visual = visual("units/hand")

/** The pictures of the units, a chibi drawn face-on, 12 by 14: every file under `units/`. */
const unitKeys = (): string[] => shippedPictures("units")

/** The icons of the processes, 7 by 7, by the key their visual gives: every file under `processes/`. */
const iconKeys = (): string[] => shippedPictures("processes")

/** The pictures stretched between two units tied together, by the visual of their tie: every file under `tethers/`. */
const tetherKeys = (): string[] => shippedPictures("tethers")

/** The pictures of the blows, played over the area they strike: every file under `fx/`. */
const fxKeys = (): string[] => shippedPictures(FX_ROOT)

/** The icons laid in the texts, as small as a letter: every file under `tiny_icon/`. */
const tinyKeys = (): string[] => shippedPictures("tiny_icon")

/** The white icons of the texts, which take the color of the text around them. */
const TINTED_ICONS: ReadonlySet<string> = new Set(["tiny_icon/heart", "tiny_icon/damage"])

/** The keys of the eyes of the button of the tactical view: the normal view, then the tactical one. */
const EYE_OPEN = "hud/eye_open"
const EYE_CLOSED = "hud/eye_closed"

/**
 * The pictures that the ambient of the map draws as sprites, besides the units: every file under `ambient/`,
 * and the mine cart a goblin pushes.
 */
const ambientKeys = (): string[] => [...shippedPictures("ambient"), "floors/mine/cart"]

/** The key of the gold coin written beside an amount of gold. */
const GOLD = "hud/icon/gold"

/** The backs of the cards, as large as a card of the hand: each deck has its own, in turn, which names it. */
const CARD_BACK_PATHS: readonly ImagePath[] = [
    "mecard/cards/back.png", "mecard/cards/back_2.png", "mecard/cards/back_3.png", "mecard/cards/back_4.png",
    "mecard/cards/back_5.png", "mecard/cards/back_6.png", "mecard/cards/back_7.png", "mecard/cards/back_8.png",
    "mecard/cards/back_9.png", "mecard/cards/back_10.png",
]

/** What crosses out a card that could not be built. */
const INVALID_CARD_PATH: ImagePath = "mecard/cards/invalid.png"

/**
 * The sprites of the units, and the icons of the processes beside their hearts, loaded together into an
 * atlas once, and shared by every screen: the board, the panels, the choices, the map. Until they are
 * loaded, or for a unit naming none, there is none, and each screen draws what it drew before.
 */
export class UnitSprites {


    /** Is every sprite loaded? */
    public get loaded(): boolean { return this.#ready }

    /** The sprite a unit names, none before the sprites are loaded, or for a name with none. */
    public of(visual: Visual|null): Sprite|null {
        return visual ? this.#pictures.get(visual.visual) ?? null : null
    }

    /** How the picture of a visual is drawn over a hitbox, as its JSON file says: the default for one without. */
    public look(visual: Visual|null): SpriteLook {
        return visual ? this.#looks.get(visual.visual) ?? DEFAULT_LOOK : DEFAULT_LOOK
    }

    /** The icon of a process, by the visual it gives, none before they are loaded or for an unknown one. */
    public icon(visual: Visual|null): Sprite|null {
        return visual ? this.#pictures.get(visual.visual) ?? null : null
    }

    /** The icon of a status, shared by the variants of its family, none before they are loaded. */
    public statusIcon(type: StatusType): Sprite|null {
        return this.#pictures.get(type.visual.visual) ?? null
    }

    /** The picture of an item or a usable, by its visual, none before it is loaded. */
    public thing(icon: Visual): Sprite|null {
        return this.#pictures.get(icon.visual) ?? null
    }

    /**
     * The picture a text lays in a line by the key it names it with: a tiny icon, a status or a process,
     * none before the sprites are loaded or for a key with none.
     */
    public readonly picture = (key: string): TextPicture|null => {
        const sprite = this.#pictures.get(key)
        return sprite ? { sprite, tinted: TINTED_ICONS.has(key) } : null
    }

    /** The eye of the button of the tactical view, open or closed, none before it is loaded. */
    public eye(open: boolean): Sprite|null {
        return this.#pictures.get(open ? EYE_OPEN : EYE_CLOSED) ?? null
    }

    /** The gold coin written beside an amount of gold, none before it is loaded. */
    public get gold(): Sprite|null {
        return this.#pictures.get(GOLD) ?? null
    }

    /** The back of the cards of a deck, by its place among the decks, none before it is loaded. */
    public cardBack(deck: number): Sprite|null {
        return this.#cardBacks[deck % CARD_BACK_PATHS.length] ?? null
    }

    /** What crosses out a card, none before it is loaded. */
    public get invalidCard(): Sprite|null {
        return this.#invalidCard
    }

    /** The worn paper of the maps, the arena lying on it, none before it is loaded. */
    public get paper(): Sprite|null {
        return this.#paper
    }

    /** The leather frame of the bags of items and usables, none before it is loaded. */
    public get bag(): NineSlice|null {
        return this.#bag
    }

    /** The embossed leather frame laid over the icon of a booster, none before it is loaded. */
    public get booster(): NineSlice|null {
        return this.#booster
    }

    /** The wood of the frames, planks and backgrounds, none before it is loaded. */
    public get wood(): Wood|null {
        return this.#wood
    }

    /** The darker spot under what stands on the arena, none before it is loaded. */
    public get shade(): Sprite|null {
        return this.#shade
    }

    /** The line of the paths of the maps, the grid of the arena drawn with it, none before it is loaded. */
    public get rope(): Rope|null {
        return this.#rope
    }

    /** What is stretched between two units tied together, by the visual of the tie, none before it is loaded. */
    public tether(visual: Visual): Rope|null {
        const known = this.#tethers.get(visual.visual)
        if(known) return known
        const picture = this.#pictures.get(visual.visual)
        if(!picture) return null
        const rope = new Rope(picture)
        this.#tethers.set(visual.visual, rope)
        return rope
    }

    /** Call something once the sprites are loaded: at once when they are already. */
    public whenLoaded(listener: () => void): void {
        if(this.loaded) listener()
        else this.#listeners.push(listener)
    }

    /**
     * Load every sprite into an atlas, then tell who waits for them.
     *
     * @throws {@link AssetError} When a picture cannot be loaded.
     */
    public async load(gpu: Gpu, assets: Assets): Promise<void> {
        const statuses = [...STATUS_TYPES, ...STATUS_FAMILIES].map(type => type.visual.visual)
        const things = [...ALL_ITEMS, ...ALL_USABLES].map(thing => thing.icon.visual)
        const halts = allHalts().map(halt => halt.icon.visual)
        const floors = ALL_FLOORS.map(floor => floor.icon.visual)
        const keys = [...new Set([
            ...unitKeys(), ...iconKeys(), ...tetherKeys(), ...fxKeys(), ...tinyKeys(), ...statuses, ...things, ...halts, ...floors,
            EYE_OPEN, EYE_CLOSED, GOLD, ...ambientKeys(),
        ])]
        const fixed = [...CARD_BACK_PATHS, INVALID_CARD_PATH, PAPER_PATH, PATH_PICTURE, SHADE_PICTURE]
        const [named, fixedPictures, bag, booster, wood] = await Promise.all([
            loadPictures(assets, keys),
            Promise.all(fixed.map(path => assets.image(path))),
            BagView.loadFrame(gpu, assets),
            loadBoosterFrame(gpu, assets),
            loadWood(gpu, assets),
        ])
        this.#bag = bag
        this.#wood = wood
        this.#booster = booster
        const atlas = new Atlas(gpu, { initialSize: 64 })
        const entries = atlas.addAll([...named.map(({ pixels }) => ({ pixels })), ...fixedPictures.map(pixels => ({ pixels }))])
        named.forEach(({ key, data }, index) => {
            this.#pictures.set(key, atlas.sprite(entries[index]))
            if(data === null) return
            try {
                this.#looks.set(key, readSpriteLook(data))
            } catch(error){
                throw new AssetError(dataPathOf(key), "invalid", error)
            }
        })
        const rest = entries.slice(named.length)
        this.#cardBacks = rest.slice(0, CARD_BACK_PATHS.length).map(entry => atlas.sprite(entry))
        this.#invalidCard = atlas.sprite(rest[CARD_BACK_PATHS.length])
        this.#paper = atlas.sprite(rest[rest.length - 3])
        this.#rope = new Rope(atlas.sprite(rest[rest.length - 2]))
        this.#shade = atlas.sprite(rest[rest.length - 1])
        this.#ready = true
        for(const listener of this.#listeners.splice(0)) listener()
    }


    readonly #pictures = new Map<string, Sprite>()
    readonly #looks = new Map<string, SpriteLook>()
    readonly #tethers = new Map<string, Rope>()
    #ready = false
    readonly #listeners: (() => void)[] = []
    #cardBacks: readonly Sprite[] = []
    #invalidCard: Sprite|null = null
    #paper: Sprite|null = null
    #rope: Rope|null = null
    #shade: Sprite|null = null
    #bag: NineSlice|null = null
    #booster: NineSlice|null = null
    #wood: Wood|null = null
}
