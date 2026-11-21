import { AssetError } from "../../../../engine/assets"
import type { Assets, ImagePath } from "../../../../engine/assets"
import { Sprite, Texture } from "../../../../engine/gpu"
import { Box, Button, Image, Label, Parallax } from "../../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../../engine/ui"

import { brownButton, DIM_TEXT, TEXT_OUTLINE } from "../look/theme"
import { parallaxSource } from "../look/visualPath"
import { LoadingOverlay } from "../run/LoadingOverlay"
import { loadParallaxPictures } from "../travel/parallaxPictures"
import { rangedOf, SCENE_WARPS } from "../travel/TravelScenes"
import type { SceneRanges } from "../travel/TravelScenes"

/** The parallax of the background, a name under `mecard/parallax/`. */
export const MENU_PARALLAX = "menu"

/** How far the layers follow the pointer, in virtual pixels, where their painting does not say. */
const MENU_DEPTHS: SceneRanges = {
    x: { far: 10, near: 60 },
    y: { far: 5, near: 25 },
}

/** How far right of the middle the menu lies, as a share of the width. */
const SIDE_SHARE = 0.16

/** The space between two buttons, in virtual pixels. */
const GAP = 4

/** The picture of the title of the game, over the buttons. */
export const TITLE_PICTURE: ImagePath = "mecard/menu/title.png"

/** The buttons of the menu, each none while it is not shown. */
interface MenuButtons {
    readonly new: Button|null
    readonly continue: Button|null
    readonly yes: Button|null
    readonly no: Button|null
    readonly guide: Button|null
    readonly history: Button|null
    readonly library: Button|null
    readonly multiplayer: Button|null
}

const NO_BUTTONS: MenuButtons = {
    new: null, continue: null, yes: null, no: null, guide: null, history: null, library: null, multiplayer: null,
}

/** What the menu asks of its game. */
export interface MainMenuOptions {
    /** Start a new run, the one kept, if any, forgotten. */
    newGame(): void

    /** Go on with the run kept. */
    continueGame(): void

    /** Open the guide. */
    openGuide(): void

    /** Open the history of the games that ended. */
    openHistory(): void

    /** Open the catalogue of what the player found. */
    openLibrary(): void

    /** Open the lobby, where the player hosts a room or joins one. */
    openMultiplayer(): void

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
        this.#backdropLayer.content.visible = visible
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
        // Only a button changes: the menu is not built again, and in the confirmation it is not even shown.
        if(this.#buttons.continue) this.#buttons.continue.enabled = hasSave
    }

    /** Can the game be played with others? Greys the button that opens the lobby when it cannot. */
    public get hasNetwork(): boolean { return this.#hasNetwork }

    public set hasNetwork(hasNetwork: boolean){
        if(hasNetwork === this.#hasNetwork) return
        this.#hasNetwork = hasNetwork
        if(this.#buttons.multiplayer) this.#buttons.multiplayer.enabled = hasNetwork
    }

    /** The button of the lobby, none while a new game is asked to be confirmed. */
    public get multiplayerButton(): Button|null { return this.#buttons.multiplayer }

    /** Is the player asked to confirm a new game? */
    public get confirming(): boolean { return this.#confirming }

    /** The button of the guide, under the one that goes on, none while a new game is asked to be confirmed. */
    public get guideButton(): Button|null { return this.#buttons.guide }

    /** The button of the history, under the guide's, none while a new game is asked to be confirmed. */
    public get historyButton(): Button|null { return this.#buttons.history }

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
        // The background moves with the pointer, drawn again while the buttons over it, in a texture of
        // their own, stay as they were.
        this.#backdropLayer = ui.addLayer("menu-backdrop")
        this.#layer = ui.addLayer("menu", { texture: true })
        this.#backdropLayer.content.visible = false
        this.#layer.content.visible = false
        this.#loading = new LoadingOverlay(ui, theme, "menu-loading")
        void this.#loading.during(this.#load(assets))
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
        const backdropContent = this.#backdropLayer.content
        for(const child of [...content.children]) content.remove(child)
        for(const child of [...backdropContent.children]) backdropContent.remove(child)
        this.#buttons = NO_BUTTONS
        if(this.#backdrop) backdropContent.add(this.#backdrop, { x: "stretch", y: "stretch" })
        // The title over the buttons, which stretch to their own widest line, not to the title's.
        const stack = new Box("column", { gap: GAP, align: "center" })
        if(this.#title) stack.add(new Image(this.#title))
        const column = new Box("column", { gap: GAP, align: "stretch" })
        stack.add(column)
        if(this.#confirming){
            const asked = "Une partie est en cours. L'écraser ?"
            column.add(new Label(theme, asked, { color: DIM_TEXT, outline: TEXT_OUTLINE, align: "center" }))
            const yes = new Button(theme, "Oui, écraser", brownButton(theme))
            yes.onActivate = () => {
                this.#confirming = false
                options.newGame()
            }
            const no = new Button(theme, "Non", brownButton(theme))
            no.onActivate = () => {
                this.#confirming = false
                this.refresh()
            }
            column.add(yes)
            column.add(no)
            this.#buttons = { ...NO_BUTTONS, yes, no }
        } else {
            const fresh = new Button(theme, "Nouvelle partie", brownButton(theme))
            fresh.onActivate = () => {
                if(this.#hasSave){
                    this.#confirming = true
                    this.refresh()
                } else options.newGame()
            }
            const resume = new Button(theme, "Continuer", { ...brownButton(theme), enabled: this.#hasSave })
            resume.onActivate = () => options.continueGame()
            column.add(fresh)
            column.add(resume)
            const multiplayer = new Button(theme, "Multijoueur", { ...brownButton(theme), enabled: this.#hasNetwork })
            multiplayer.onActivate = () => options.openMultiplayer()
            column.add(multiplayer)
            const guide = new Button(theme, "Guide", brownButton(theme))
            guide.onActivate = () => options.openGuide()
            column.add(guide)
            const history = new Button(theme, "Historique", brownButton(theme))
            history.onActivate = () => options.openHistory()
            column.add(history)
            const library = new Button(theme, "Catalogue", brownButton(theme))
            library.onActivate = () => options.openLibrary()
            column.add(library)
            this.#buttons = { ...NO_BUTTONS, new: fresh, continue: resume, multiplayer, guide, history, library }
        }
        // Right of the middle, where the cabin of the landscape is not.
        content.add(stack, { x: "center", y: "center", offsetX: Math.round(ui.width * SIDE_SHARE) })
    }

    /** Free the pictures of the background. */
    public dispose(): void {
        this.#disposed = true
        for(const texture of this.#textures) texture.dispose()
        this.#textures = []
    }


    readonly #layer: Layer

    /** The layer under it, holding the background. */
    readonly #backdropLayer: Layer

    /** The sign shown while the pictures of the menu load. */
    readonly #loading: LoadingOverlay
    #hasSave = false
    #hasNetwork = false
    #confirming = false
    #backdrop: Parallax|null = null

    /** The picture of the title, none while it is not loaded or cannot be. */
    #title: Sprite|null = null
    #textures: Texture[] = []
    #disposed = false

    /** The size of the interface it was laid out for, none before the first frame. */
    #size = ""

    #buttons: MenuButtons = NO_BUTTONS

    /** Load the picture of the title: the menu goes without it when it cannot be. */
    async #loadTitle(assets: Assets): Promise<void> {
        let pixels
        try {
            pixels = await assets.image(TITLE_PICTURE)
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            this.options.report(`Le titre du menu n'a pas pu être chargé : ${error.message}`)
            return
        }
        if(this.#disposed) return
        const texture = Texture.fromPixels(this.ui.gpu, pixels)
        this.#textures.push(texture)
        this.#title = Sprite.whole(texture)
        this.refresh()
    }

    /** Load the pictures of the background: the menu stays on its plain color when they cannot be. */
    async #load(assets: Assets): Promise<void> {
        await this.#loadTitle(assets)
        let backdrop
        try {
            backdrop = await loadParallaxPictures(assets, parallaxSource(MENU_PARALLAX))
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            this.options.report(`Le fond du menu n'a pas pu être chargé : ${error.message}`)
            return
        }
        if(this.#disposed) return
        for(const warning of backdrop.warnings) this.options.report(warning)
        const layers = backdrop.layers
        // Kept with the title's: replacing the list would lose the texture of the title.
        const textures = layers.map(layer => Texture.fromPixels(this.ui.gpu, layer.pixels))
        this.#textures.push(...textures)
        const depths = backdrop.ranges.depth ?? MENU_DEPTHS
        const warps = backdrop.ranges.warp ?? SCENE_WARPS
        this.#backdrop = new Parallax(layers.map((layer, index) => ({
            sprite: Sprite.whole(textures[index]),
            depth: layer.depth ?? rangedOf(index, layers.length, depths),
            warp: layer.warp ?? rangedOf(index, layers.length, warps),
            ...layer.place && { place: layer.place },
        })), { opaque: true })
        this.refresh()
    }
}
