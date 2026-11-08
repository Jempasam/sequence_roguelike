import { AssetError } from "../../../../engine/assets"
import type { Assets, ImagePath } from "../../../../engine/assets"
import { Sprite, Texture } from "../../../../engine/gpu"
import { Box, Button, Label, Parallax } from "../../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../../engine/ui"

import { CHOSEN_TEXT, DIM_TEXT, TEXT_OUTLINE } from "../look/theme"

/** The pictures of the background, from the farthest to the nearest. */
export const MENU_LAYERS: readonly ImagePath[] = [
    "mecard/menu/1.png", "mecard/menu/2.png", "mecard/menu/3.png", "mecard/menu/4.png",
    "mecard/menu/5.png", "mecard/menu/6.png", "mecard/menu/7.png", "mecard/menu/8.png", "mecard/menu/9.png",
]

/** How far the farthest and the nearest layers follow the pointer, in virtual pixels. */
const FAR_DEPTH = 2
const NEAR_DEPTH = 24

/** How far right of the middle the menu lies, as a share of the width. */
const SIDE_SHARE = 0.16

/** The space between two buttons, in virtual pixels. */
const GAP = 4

/** The title of the game. */
const TITLE = "Dungeon of the Mecard"

/** What the menu asks of its game. */
export interface MainMenuOptions {
    /** Start a new run, the one kept, if any, forgotten. */
    newGame(): void

    /** Go on with the run kept. */
    continueGame(): void

    /** Open the guide. */
    openGuide(): void

    /** Tell the players something went wrong. */
    report(text: string): void
}

/**
 * The main menu: a parallax of a landscape, the title, and the choice between a new game and the one kept.
 *
 * @remarks
 * It decides nothing: it tells its game what was chosen. Starting a new game over a game kept is asked
 * again, since it would replace it.
 */
export class MainMenuScreen {


    /** Is the menu shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        if(visible === this.visible) return
        this.#layer.content.visible = visible
        if(visible){
            this.#confirming = false
            this.#size = ""
        }
    }

    /** Is there a game to go on with? Greys the button that goes on with it. */
    public get hasSave(): boolean { return this.#hasSave }

    public set hasSave(hasSave: boolean){
        if(hasSave === this.#hasSave) return
        this.#hasSave = hasSave
        this.refresh()
    }

    /** Is the player asked to confirm a new game? */
    public get confirming(): boolean { return this.#confirming }

    /** The button of the guide, under the one that goes on, none while a new game is asked to be confirmed. */
    public get guideButton(): Button|null { return this.#buttons.guide }

    /** The button of a new game, none while it is asked to be confirmed. */
    public get newButton(): Button|null { return this.#buttons.new }

    /** The button that goes on with the game kept, none while a new game is asked to be confirmed. */
    public get continueButton(): Button|null { return this.#buttons.continue }

    /** The button that confirms a new game over the one kept, none out of the confirmation. */
    public get yesButton(): Button|null { return this.#buttons.yes }

    /** The button that gives up a new game over the one kept, none out of the confirmation. */
    public get noButton(): Button|null { return this.#buttons.no }

    constructor(
        public readonly theme: Theme,

        /** The interface the menu lays its panels in. */
        public readonly ui: UiRoot,

        public readonly options: MainMenuOptions,

        /** Where the pictures of the background come from. */
        assets: Assets,
    ){
        this.#layer = ui.addLayer("menu")
        this.#layer.content.visible = false
        void this.#load(assets)
    }


    /** Lay the menu out again when the interface changed size. */
    public frame(): void {
        const size = `${this.ui.width}×${this.ui.height}`
        if(size === this.#size) return
        this.#size = size
        this.refresh()
    }

    /** Build the background and the buttons again. */
    public refresh(): void {
        const { theme, ui, options } = this
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        this.#buttons = { new: null, continue: null, yes: null, no: null, guide: null }
        if(this.#backdrop) content.add(this.#backdrop, { x: "stretch", y: "stretch" })
        // As wide as its widest line, which the buttons stretch to.
        const column = new Box("column", { gap: GAP, align: "stretch" })
        const title = new Label(theme, TITLE, { color: CHOSEN_TEXT, outline: TEXT_OUTLINE, align: "center" })
        column.add(title)
        if(this.#confirming){
            const asked = "Une partie est en cours. L'écraser ?"
            column.add(new Label(theme, asked, { color: DIM_TEXT, outline: TEXT_OUTLINE, align: "center" }))
            const yes = new Button(theme, "Oui, écraser")
            yes.onActivate = () => {
                this.#confirming = false
                options.newGame()
            }
            const no = new Button(theme, "Non")
            no.onActivate = () => {
                this.#confirming = false
                this.refresh()
            }
            column.add(yes)
            column.add(no)
            this.#buttons = { new: null, continue: null, yes, no, guide: null }
        } else {
            const fresh = new Button(theme, "Nouvelle partie")
            fresh.onActivate = () => {
                if(this.#hasSave){
                    this.#confirming = true
                    this.refresh()
                } else options.newGame()
            }
            const resume = new Button(theme, "Continuer", { enabled: this.#hasSave })
            resume.onActivate = () => options.continueGame()
            column.add(fresh)
            column.add(resume)
            const guide = new Button(theme, "Guide")
            guide.onActivate = () => options.openGuide()
            column.add(guide)
            this.#buttons = { new: fresh, continue: resume, yes: null, no: null, guide }
        }
        // Right of the middle, where the cabin of the landscape is not.
        content.add(column, { x: "center", y: "center", offsetX: Math.round(ui.width * SIDE_SHARE) })
    }

    /** Free the pictures of the background. */
    public dispose(): void {
        this.#disposed = true
        for(const texture of this.#textures) texture.dispose()
        this.#textures = []
    }


    readonly #layer: Layer
    #hasSave = false
    #confirming = false
    #backdrop: Parallax|null = null
    #textures: Texture[] = []
    #disposed = false

    /** The size of the interface it was laid out for, none before the first frame. */
    #size = ""

    #buttons: {
        new: Button|null, continue: Button|null, yes: Button|null, no: Button|null, guide: Button|null,
    } = { new: null, continue: null, yes: null, no: null, guide: null }

    /** Load the pictures of the background: the menu stays on its plain color when they cannot be. */
    async #load(assets: Assets): Promise<void> {
        let pictures
        try {
            pictures = await Promise.all(MENU_LAYERS.map(path => assets.image(path)))
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            this.options.report(`Le fond du menu n'a pas pu être chargé : ${error.message}`)
            return
        }
        if(this.#disposed) return
        this.#textures = pictures.map(picture => Texture.fromPixels(this.ui.gpu, picture))
        const count = this.#textures.length
        this.#backdrop = new Parallax(this.#textures.map((texture, index) => ({
            sprite: Sprite.whole(texture),
            depth: Math.round(FAR_DEPTH + (NEAR_DEPTH - FAR_DEPTH) * index / Math.max(1, count - 1)),
        })))
        this.refresh()
    }
}
