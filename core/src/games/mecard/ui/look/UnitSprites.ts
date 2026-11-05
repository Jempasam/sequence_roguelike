import { Atlas } from "../../../../engine/atlas"
import type { Assets, ImagePath } from "../../../../engine/assets"
import type { Gpu, Sprite } from "../../../../engine/gpu"

/** The picture of each sprite a unit may name, a chibi drawn face-on, 12 by 14. */
const SPRITE_PATHS: Readonly<Record<string, ImagePath>> = {
    lancer: "mecard/units/lancer.png",
    swordsman: "mecard/units/swordsman.png",
    archer: "mecard/units/archer.png",
    brawler: "mecard/units/brawler.png",
    artificer: "mecard/units/artificer.png",
    mage: "mecard/units/mage.png",
    assassin: "mecard/units/assassin.png",
    apothecary: "mecard/units/apothecary.png",
    puppeteer: "mecard/units/puppeteer.png",
    goblin: "mecard/units/goblin.png",
    monster_archer: "mecard/units/monster_archer.png",
    brute: "mecard/units/brute.png",
    hunter: "mecard/units/hunter.png",
    berserker: "mecard/units/berserker.png",
    golem: "mecard/units/golem.png",
    troll: "mecard/units/troll.png",
    megalaser: "mecard/units/megalaser.png",
    devil: "mecard/units/devil.png",
    mechanic: "mecard/units/mechanic.png",
    bull: "mecard/units/bull.png",
    kamikaze_robot: "mecard/units/kamikaze_robot.png",
    fire_mage: "mecard/units/fire_mage.png",
    elf_assassin: "mecard/units/elf_assassin.png",
    goblin_rider: "mecard/units/goblin_rider.png",
    stone_golem: "mecard/units/stone_golem.png",
    slime: "mecard/units/slime.png",
    elf_archer: "mecard/units/elf_archer.png",
    ice_mage: "mecard/units/ice_mage.png",
    imp: "mecard/units/imp.png",
    robot: "mecard/units/robot.png",
    tornado: "mecard/units/tornado.png",
    wave: "mecard/units/wave.png",
    rock: "mecard/units/rock.png",
    mine: "mecard/units/mine.png",
    shadow: "mecard/units/shadow.png",
    coin: "mecard/units/coin.png",
    log: "mecard/units/log.png",
    stone: "mecard/units/stone.png",
    barrel: "mecard/units/barrel.png",
    totem: "mecard/units/totem.png",
    thorns: "mecard/units/thorns.png",
    bomb: "mecard/units/bomb.png",
    fire: "mecard/units/fire.png",
    puddle: "mecard/units/puddle.png",
}

/** The icon of each process, 7 by 7, by the name the process gives. */
const ICON_PATHS: Readonly<Record<string, ImagePath>> = {
    strength: "mecard/processes/strength.png",
    horse: "mecard/processes/horse.png",
    haste: "mecard/processes/haste.png",
    ritual: "mecard/processes/ritual.png",
    shadow_link: "mecard/processes/shadow_link.png",
}

/** The backs of the cards, as large as a card of the hand: each deck has its own, in turn, which names it. */
const CARD_BACK_PATHS: readonly ImagePath[] = [
    "mecard/cards/back.png", "mecard/cards/back_2.png", "mecard/cards/back_3.png", "mecard/cards/back_4.png",
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
    public get loaded(): boolean { return this.#sprites.size > 0 }

    /** The sprite a unit names, none before the sprites are loaded, or for a name with none. */
    public of(name: string|null): Sprite|null {
        return name ? this.#sprites.get(name) ?? null : null
    }

    /** The icon of a process, by the name it gives, none before they are loaded or for an unknown one. */
    public icon(name: string): Sprite|null {
        return this.#icons.get(name) ?? null
    }

    /** The back of the cards of a deck, by its place among the decks, none before it is loaded. */
    public cardBack(deck: number): Sprite|null {
        return this.#cardBacks[deck % CARD_BACK_PATHS.length] ?? null
    }

    /** What crosses out a card, none before it is loaded. */
    public get invalidCard(): Sprite|null {
        return this.#invalidCard
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
        const named = Object.entries(SPRITE_PATHS)
        const icons = Object.entries(ICON_PATHS)
        const paths = [...named, ...icons].map(([, path]) => path)
        const others = [...CARD_BACK_PATHS, INVALID_CARD_PATH]
        const pictures = await Promise.all([...paths, ...others].map(path => assets.image(path)))
        const atlas = new Atlas(gpu, { initialSize: 64 })
        const entries = atlas.addAll(pictures.map(pixels => ({ pixels })))
        named.forEach(([name], index) => this.#sprites.set(name, atlas.sprite(entries[index])))
        icons.forEach(([name], index) => this.#icons.set(name, atlas.sprite(entries[named.length + index])))
        const backs = entries.slice(paths.length, -1)
        this.#cardBacks = backs.map(entry => atlas.sprite(entry))
        this.#invalidCard = atlas.sprite(entries[entries.length - 1])
        for(const listener of this.#listeners.splice(0)) listener()
    }


    readonly #sprites = new Map<string, Sprite>()
    readonly #icons = new Map<string, Sprite>()
    readonly #listeners: (() => void)[] = []
    #cardBacks: readonly Sprite[] = []
    #invalidCard: Sprite|null = null
}
