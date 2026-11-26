import { AnimationChain, FrameClock } from "../../../../engine/ui"
import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Box, Button, Component, EMPTY_HINT, Label, NineSlice, Panel, Slider } from "../../../../engine/ui"
import type { Layer, SizeHint, Theme, UiRoot } from "../../../../engine/ui"
import { visual } from "../../sim/base/Visual"
import type { Visual } from "../../sim/base/Visual"
import { Vector2 } from "../../sim/base/Vector2"
import type { Area } from "../../sim/battle/Area"
import * as Areas from "../../sim/battle/area/Areas"
import { Arena } from "../../sim/battle/Arena"
import { Battle } from "../../sim/battle/Battle"
import { DamageType } from "../../sim/battle/DamageType"
import { Team } from "../../sim/battle/Team"
import { Heart } from "../../sim/heart/Heart"
import { RED_HEART } from "../../sim/heart/subs/RedHeartKind"
import { BattleAnimations } from "../battle/BattleAnimations"
import { BattleScene } from "../battle/BattleScene"
import { BoardView } from "../battle/BoardView"
import { PlayControl } from "../hud/PlayControl"

import { resolveFx } from "./FxSprites"
import { DIM_TEXT } from "./theme"
import type { UnitSprites } from "./UnitSprites"
import { FX_ROOT, shippedPictures } from "./visualPath"

/** The color behind the bench. */
const BACKDROP = new Color(0.16, 0.15, 0.2)

/** The width of the panel of the controls, in virtual pixels, and the space around and between things. */
const SIDE_WIDTH = 150
const MARGIN = 4

/** The size of the arena the blow is tried in, in meters. */
const ARENA = new Arena(9, 6)

/** How long the bench waits between a blow and the next, in seconds. */
const PAUSE = 0.6

/** How long a frame by frame step lets go by, in seconds. */
const STEP_TIME = 1 / 60

/** How many hearts the unit hit has: more than a blow takes. */
const HEARTS = 5

/** How many lines the panel says what was found in. */
const INFO_LINES = 4

/** What a unit the blow lands on has to be: enemies, so the blow is aimed at them. */
const HEROES = new Team("Bancs")
const FOES = new Team("Cibles")

/** The shapes of area a blow is tried with: the arc of a sword, a line, a circle around the attacker. */
/** How an area is made from where the blow starts, where it goes and how far. */
type AreaMaker = (from: Vector2, forward: Vector2, reach: number) => Area

const SHAPES: readonly { readonly name: string, readonly area: AreaMaker }[] = [
    { name: "Arc de 120°", area: (from, forward, reach) => Areas.arc(from, forward, reach, 0.5) },
    { name: "Arc de 60°", area: (from, forward, reach) => Areas.arc(from, forward, reach, Math.cos(Math.PI / 6)) },
    { name: "Ligne", area: (from, forward, reach) => Areas.line(from, from.plus(forward.times(reach)), 0.5) },
    { name: "Cercle autour", area: (from, _forward, reach) => Areas.circle(from, reach) },
    { name: "Croissant", area: (from, forward, reach) => Areas.crescent(from, forward, reach * 0.5, reach, 0.5) },
]

/** What the bench hears from the game. */
export interface AnimationBenchHost {
    /** Tell the players something went wrong. */
    report(text: string): void

    /** Leave the bench, back to where it was opened from. */
    leave(): void
}

/**
 * The bench of the animations of the blows: one blow struck again and again by a unit at another, on a real
 * battle played by the same animations as the game, drawn by the same board. The panel in the top left
 * corner chooses the picture of the blow (none for the area as it is), the units, the shape and the reach
 * of its area, and says which picture was found and how the blow was placed.
 *
 * @remarks
 * A tool, opened by the console. Nothing it sets is written.
 */
export class AnimationBenchScreen {


    constructor(
        public readonly theme: Theme,

        /** The interface the bench lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: AnimationBenchHost,

        /** The pictures of the blows and of the units. */
        public readonly sprites: UnitSprites,
    ){
        this.#layer = ui.addLayer("animations")
        this.#layer.content.visible = false
        this.#blows = [null, ...shippedPictures(FX_ROOT).map(key => key.slice(`${FX_ROOT}/`.length))]
        this.#units = shippedPictures("units").map(key => visual(key))
        this.#view = new BenchView(theme, sprites, this)
        this.#build()
    }


    /** Is the bench shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        this.#layer.content.visible = visible
        if(visible) this.#view.restart()
    }

    /**
     * Let time go by while the bench is shown: the game calls it every frame, as for the other benches, since
     * a component ticking only when the interface updates would stop with the screen of the run hidden.
     *
     * @param dt - The time since the frame before, in seconds.
     */
    public frame(dt: number): void {
        this.#view.advance(dt)
        this.#sayState()
    }

    /** Play the blow again from its start. */
    public play(): void {
        this.#view.restart()
        this.#sayState()
    }

    /** Hold the blow where it is, or let it go on. */
    public togglePause(): void {
        this.#view.paused = !this.#view.paused
        this.#pauseButton.text = this.#view.paused ? "Reprendre" : "Pause"
        this.#sayState()
    }

    /** Hold the blow, and let a single frame of it go by. */
    public step(): void {
        if(!this.#view.paused) this.togglePause()
        this.#view.step()
        this.#sayState()
    }

    /** Strike again by itself when the blow is over, or wait to be asked. */
    public toggleLoop(): void {
        this.#view.looping = !this.#view.looping
        this.#loopButton.text = this.#view.looping ? "Boucle : oui" : "Boucle : non"
    }

    /** Show a blow, none for the area as it is. */
    public show(blow: Visual|null): void {
        this.#blow = Math.max(0, blow ? this.#blows.indexOf(blow.visual) : 0)
        this.#refresh()
        this.sprites.whenLoaded(() => this.#view.restart())
    }

    /** The picture of the blow tried, none for the area as it is. */
    public get blow(): Visual|null {
        const key = this.#blows[this.#blow]
        return key === null ? null : visual(key)
    }

    /** The unit that strikes. */
    public get attacker(): Visual { return this.#units[this.#attacker] }

    /** The unit struck. */
    public get target(): Visual { return this.#units[this.#target] }

    /** The area of the blow, from where the attacker stands. */
    public areaFrom(from: Vector2, forward: Vector2): Area {
        return SHAPES[this.#shape].area(from, forward, this.#reach.value)
    }

    /** How far the target stands from the attacker, in meters. */
    public get distance(): number { return this.#distance.value }

    /** How fast the bench plays, 1 for the pace of the game. */
    public get speed(): number { return this.#speed.value }

    /** How far the blow playing went, from 0 to 1, none when no blow is playing. */
    public get progress(): number|null { return this.#view.progress }

    /** Say what was found for the blow playing. */
    public say(lines: readonly string[]): void {
        this.#info.forEach((label, index) => {
            const text = lines[index] ?? ""
            if(label.text !== text) label.text = text
        })
    }


    readonly #layer: Layer
    readonly #blows: readonly (string|null)[]
    readonly #units: readonly Visual[]
    readonly #view: BenchView
    #blow = 0
    #attacker = 0
    #target = 0
    #shape = 0
    #blowLabel!: Label
    #attackerLabel!: Label
    #targetLabel!: Label
    #shapeLabel!: Label
    #info: Label[] = []
    #state!: Label
    #pauseButton!: Button
    #loopButton!: Button
    #reach!: Slider
    #distance!: Slider
    #speed!: Slider

    #build(): void {
        const content = this.#layer.content
        const backdrop = new Panel(this.theme, {
            background: NineSlice.flat(this.theme.white, BACKDROP), padding: 0, interactive: false,
        })
        content.add(backdrop, { x: "stretch", y: "stretch" })
        content.add(this.#view, { x: "stretch", y: "stretch" })
        const side = new Panel(this.theme)
        side.content = this.#controls()
        content.add(side, { x: "start", y: "start", offsetX: MARGIN, offsetY: MARGIN })
    }

    #controls(): Box {
        const column = new Box("column", { gap: MARGIN / 2, align: "stretch" })
        const back = new Button(this.theme, "Retour")
        back.onActivate = () => this.host.leave()
        column.add(back)
        const playing = new Box("row", { gap: MARGIN / 2, align: "stretch" })
        this.#pauseButton = new Button(this.theme, "Pause")
        this.#loopButton = new Button(this.theme, "Boucle : oui")
        for(const [button, action] of [
            [new Button(this.theme, "Jouer"), () => this.play()],
            [this.#pauseButton, () => this.togglePause()],
            [new Button(this.theme, "Pas"), () => this.step()],
        ] as const){
            button.onActivate = action
            playing.add(button, { grow: 1 })
        }
        column.add(playing)
        this.#loopButton.onActivate = () => this.toggleLoop()
        column.add(this.#loopButton)
        this.#state = new Label(this.theme, " ", { color: DIM_TEXT })
        column.add(this.#state)
        this.#blowLabel = this.#cycle(column, this.#blows.length, () => this.#blow, index => {
            this.#blow = index
            this.#changed()
        })
        this.#attackerLabel = this.#cycle(column, this.#units.length, () => this.#attacker, index => {
            this.#attacker = index
            this.#changed()
        })
        this.#targetLabel = this.#cycle(column, this.#units.length, () => this.#target, index => {
            this.#target = index
            this.#changed()
        })
        this.#shapeLabel = this.#cycle(column, SHAPES.length, () => this.#shape, index => {
            this.#shape = index
            this.#changed()
        })
        this.#reach = this.#slider(column, "Portée", 0.5, 4, 0.1, 1.3, () => this.#view.restart())
        this.#distance = this.#slider(column, "Distance", 0.5, 4, 0.1, 1.5, () => this.#view.restart())
        this.#speed = this.#slider(column, "Vitesse", 0.05, 2, 0.05, 1, () => {})
        for(let line = 0; line < INFO_LINES; line++){
            const label = new Label(this.theme, " ", { color: DIM_TEXT })
            this.#info.push(label)
            column.add(label)
        }
        column.fixedSize = { width: SIDE_WIDTH, height: column.measure(SIDE_WIDTH).preferredHeight }
        this.#refresh()
        return column
    }

    /** A line with a button each side to go through some choices, its label saying which is chosen. */
    #cycle(column: Box, count: number, read: () => number, write: (index: number) => void): Label {
        const row = new Box("row", { gap: MARGIN / 2, align: "center" })
        const label = new Label(this.theme, "")
        const step = (by: number) => () => write((read() + by + count) % count)
        const previous = new Button(this.theme, "◀")
        previous.onActivate = step(-1)
        const next = new Button(this.theme, "▶")
        next.onActivate = step(1)
        row.add(previous)
        row.add(label, { grow: 1 })
        row.add(next)
        column.add(row)
        return label
    }

    /** A slider with its label above it. */
    #slider(
        column: Box, name: string, min: number, max: number, step: number, value: number,
        onChange: (value: number) => void,
    ): Slider {
        const label = new Label(this.theme, "", { color: DIM_TEXT })
        const slider = new Slider(this.theme, { min, max, step, value })
        const say = () => {
            label.text = `${name} : ${slider.value}`
        }
        say()
        slider.onChange = value => {
            say()
            onChange(value)
        }
        column.add(label)
        column.add(slider)
        return slider
    }

    /** Say whether the blow plays, is held or is over, and how far it went. */
    #sayState(): void {
        const { progress } = this
        let text = "terminé"
        if(this.#view.paused) text = "en pause"
        else if(progress !== null) text = "en lecture"
        if(progress !== null) text += ` ${Math.round(progress * 100)} %`
        if(this.#state.text !== text) this.#state.text = text
    }

    /** Something chosen changed: say it, and strike again from the start. */
    #changed(): void {
        this.#refresh()
        this.#view.restart()
    }

    /** Say what is chosen. */
    #refresh(): void {
        const name = (look: Visual) => look.visual.replace("units/", "")
        this.#blowLabel.text = this.#blows[this.#blow] ?? "(aucun)"
        this.#attackerLabel.text = `Attaque : ${name(this.attacker)}`
        this.#targetLabel.text = `Cible : ${name(this.target)}`
        this.#shapeLabel.text = SHAPES[this.#shape].name
    }
}

/** The battle struck again and again, and drawn by the board of the game. */
class BenchView extends Component {


    /** How far the blow playing went, from 0 to 1, none when no blow is playing. */
    public get progress(): number|null { return this.#scene?.strikes[0]?.share ?? null }

    constructor(
        private readonly theme: Theme,
        private readonly sprites: UnitSprites,
        private readonly bench: AnimationBenchScreen,
    ){
        super()
    }


    /** Strike from the start, on a battle made anew. */
    public restart(): void {
        this.#chain?.cancel()
        const battle = new Battle(ARENA, 1)
        const spec = { hearts: Heart.many(RED_HEART, HEARTS), decks: [[]], controller: "bot" as const }
        const from = new Vector2(2, ARENA.height / 2)
        const attacker = battle.add({
            ...spec, name: "attaquant", sprite: this.bench.attacker, team: HEROES, position: from, direction: Vector2.RIGHT,
        })
        battle.add({
            ...spec, name: "cible", sprite: this.bench.target, team: FOES,
            position: from.plus(new Vector2(this.bench.distance, 0)), direction: Vector2.LEFT,
        })
        const scene = new BattleScene()
        const clock = new FrameClock()
        const chain = new AnimationChain(error => this.bench.host.report(String(error)))
        const animations = new BattleAnimations(scene, chain, clock, new PlayControl(clock))
        const { sprites } = this
        animations.resolveFx = (look, target) => {
            return resolveFx(sprites, look, target ? sprites.look(target.sprite).tags : [])
        }
        scene.resync(battle)
        animations.register(battle)
        battle.strike(
            attacker,
            this.bench.areaFrom(from, Vector2.RIGHT),
            1,
            DamageType.PHYSICAL,
            () => 1,
            this.bench.blow,
        )
        this.#battle = battle
        this.#scene = scene
        this.#board = new BoardView(this.theme.font, this.theme.white, scene, sprites)
        this.#clock = clock
        this.#chain = chain
        this.#waited = 0
        this.invalidate()
    }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    /**
     * Let time go by: the blow plays on, and strikes again when it is over and a pause has gone by.
     *
     * @param dt - The time since the frame before, in seconds.
     */
    public advance(dt: number): void {
        if(!this.paused) this.#go(dt)
    }

    /** Let a single frame of the blow go by, held or not. */
    public step(): void {
        this.#go(STEP_TIME)
    }

    /** Whether time stands still. */
    public paused = false

    /** Whether the blow is struck again once it is over. */
    public looping = true

    /** Let a time go by, the speed of the bench applied. */
    #go(dt: number): void {
        if(!this.#chain || !this.#clock || !this.#scene) return
        this.#clock.advance(dt * this.bench.speed)
        const strike = this.#scene.strikes[0]
        if(strike){
            const { placement, shown } = strike
            const found = shown.kind === "sprite" ? `${shown.key} (rang ${shown.rank})` : `zone (rang ${shown.rank})`
            this.bench.say([
                found,
                `rotation ${placement.rotation.toFixed(2)}`,
                `portée ${placement.reach.toFixed(2)} largeur ${placement.halfWidth.toFixed(2)}`,
                `éventail ${placement.spread.toFixed(2)}`,
            ])
        }
        if(!this.#chain.busy && this.looping){
            this.#waited += dt
            if(this.#waited >= PAUSE) this.restart()
        }
        this.invalidate()
    }

    protected paint(painter: Painter): void {
        if(!this.#board || !this.#battle) return
        const { width, height } = this.bounds
        this.#board.fit(this.#battle, {
            left: SIDE_WIDTH + MARGIN * 2, top: 0, right: width, bottom: height,
        })
        painter.push()
        painter.clip(0, 0, width, height)
        this.#board.draw(painter, this.#battle)
        painter.pop()
    }


    #battle: Battle|null = null
    #scene: BattleScene|null = null
    #board: BoardView|null = null
    #clock: FrameClock|null = null
    #chain: AnimationChain|null = null
    #waited = 0
}
