import type { Painter } from "../../gpu"

import type { Component } from "../Component"
import { ContentContainer } from "../Container"
import type { NineSlice } from "../NineSlice"
import { Rect } from "../Rect"
import { EMPTY_HINT, paddedHint, sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"
import type { UiEvent } from "../input/UiEvent"
import { Box } from "../layout/Box"
import { OverflowContainer } from "../layout/OverflowContainer"
import { Scroll } from "../layout/Scroll"
import { Tilt } from "../layout/Tilt"

/** How far an option leans either way as it wobbles, in radians. */
const WOBBLE_ANGLE = 0.025

/** How long a wobble lasts, from one side to the other and back, in seconds. */
const WOBBLE_PERIOD = 2.6

/** How far apart the wobbles of two options next to each other are, as a share of a turn. */
const WOBBLE_SHIFT = 0.23

/** How much larger an option is drawn under the pointer. */
const HOVER_SCALE = 1.15

/** How much larger a picked option stays drawn. */
const PICKED_SCALE = 1.07

/** How fast an option grows or shrinks to its size, as the share of the way left it goes each second. */
const GROW_RATE = 14

/** How close to its size an option is put to it at once. */
const GROW_SNAP = 0.002

/**
 * How much of each option stays in sight while another shows whole, in virtual pixels: when the width
 * leaves less, too little of them shows, and they scroll side by side.
 */
const OPTION_STRIP = 24

/** A step of a choice: what it asks, and the components offered. */
export interface ChoiceStep {
    /** What it asks, shown above its options, none when it asks nothing. */
    readonly title: Component|null

    /** What is offered, from left to right. Each is picked whole: its own pointer is taken. */
    readonly options: readonly Component[]
}

/** How a choice is set up. */
export interface ChoiceOptions {
    /** The space between two options when there is room, in virtual pixels. */
    readonly gap?: number

    /** The space between two steps, and between a title and its options, in virtual pixels. */
    readonly spacing?: number

    /**
     * The frame drawn around the option picked in each step, and how far out of the option it goes, in
     * virtual pixels: every option keeps that room around it, so picking lays nothing out again. None by
     * default.
     */
    readonly picked?: { readonly frame: NineSlice, readonly width: number }|null
}

/**
 * Choices made one after the other: each step offers components side by side, centered, held as a hand of
 * cards when they are many, scrolling sideways when they are too wide for that, or when one alone is wider
 * than the choice. Each leans from side to side, grows under the pointer, and a click picks it.
 * The next step appears under the one picked in; picking in the last one is done. An option under the
 * pointer stands straight as it grows, so it reads well: a turned text loses pixels.
 *
 * @remarks
 * What a step offers may depend on what was picked before: the steps come from a function of the picks.
 * Picking again in an earlier step drops the steps after it, and offers anew from there. The options wobble
 * while they are shown, so a choice draws its options again every frame.
 */
export class Choice extends ContentContainer {


    /** What the pointer coming over an option or leaving does, nothing when none. */
    public onHover: ((step: number, option: number, over: boolean) => void)|null = null

    /**
     * @param next - The step following picks, the index of the option picked in each step before: the
     *   first step for none, none once the picks are done.
     * @param done - What the picks are for, called once the last step is picked in.
     * @throws {@link Error} When there is no first step.
     */
    constructor(
        /** The look of the bar of a step that scrolls. */
        public readonly theme: Theme,

        next: (picks: readonly number[]) => ChoiceStep|null,
        done: (picks: readonly number[]) => void,
        options: ChoiceOptions = {},
    ){
        super()
        this.#next = next
        this.#done = done
        this.#gap = options.gap ?? 0
        this.#picked = options.picked ?? null
        this.#steps = new Box("column", { gap: options.spacing ?? 0, align: "stretch" })
        this.content = this.#steps
        const first = next([])
        if(!first) throw new Error("A choice was made with no step to choose in.")
        this.#open(first)
    }


    /** The index of the option picked in each step so far. */
    public get picks(): readonly number[] { return this.#picks }


    protected computeHint(maxWidth: number): SizeHint {
        return this.content?.measure(maxWidth) ?? EMPTY_HINT
    }

    /** Draws nothing of its own: its steps draw. */
    protected paint(): void {}

    protected override arranged(): void {
        const { width, height } = this.bounds
        if(this.content) this.place(this.content, this.#rect.set(0, 0, width, height))
    }


    readonly #next: (picks: readonly number[]) => ChoiceStep|null
    readonly #done: (picks: readonly number[]) => void
    readonly #gap: number
    readonly #picked: { readonly frame: NineSlice, readonly width: number }|null

    /** The steps, one under the other. */
    readonly #steps: Box

    /** The options of each step shown. */
    readonly #options: ChoiceOption[][] = []

    readonly #picks: number[] = []
    readonly #rect = new Rect()

    /** Show a step under the others. */
    #open(step: ChoiceStep): void {
        const depth = this.#options.length
        const column = new Box("column", { gap: this.#steps.gap, align: "stretch" })
        if(step.title) column.add(step.title, { align: "center" })
        const hand = new OverflowContainer({ gap: this.#gap, strip: OPTION_STRIP })
        const options = step.options.map((content, index) => {
            const phase = (depth + index) * WOBBLE_SHIFT * 2 * Math.PI
            const option = new ChoiceOption(content, phase, this.#picked)
            option.onPick = () => this.#pick(depth, index)
            option.onHover = over => this.onHover?.(depth, index, over)
            hand.add(option)
            return option
        })
        column.add(new OptionRow(this.theme, hand))
        this.#steps.add(column)
        this.#options.push(options)
    }

    /** Pick an option of a step: the steps after it go, then the next one comes, or the picks are done. */
    #pick(depth: number, index: number): void {
        const steps = this.#steps.children
        for(let after = steps.length - 1; after > depth; after--) this.#steps.remove(steps[after])
        this.#options.length = depth + 1
        this.#picks.length = depth
        this.#picks.push(index)
        this.#options[depth].forEach((option, each) => {
            option.picked = each === index
        })
        const next = this.#next(this.#picks)
        if(next) this.#open(next)
        else this.#done([...this.#picks])
    }
}

/**
 * The options of a step: a hand as wide as the row while they may overlap, else a hand as wide as they
 * are, scrolled. Either way each option gets its whole size: it is posed, so it cannot be cut.
 */
class OptionRow extends ContentContainer {


    constructor(
        public readonly theme: Theme,

        /** The options. */
        public readonly hand: OverflowContainer,
    ){
        super()
        this.#scroll = new Scroll(theme, { axis: "horizontal", width: 0, height: 0 })
        this.#scroll.content = hand
        this.content = this.#scroll
    }


    /** As tall as its tallest option, and the bar when it scrolls at that width, and as narrow as asked. */
    protected computeHint(maxWidth: number): SizeHint {
        const { total, tallest } = this.#sizes()
        const height = tallest + (this.#scrolls(maxWidth) ? this.theme.scrollbar.width : 0)
        return sizeHint(0, height, total, height)
    }

    /** Draws nothing of its own: its options draw. */
    protected paint(): void {}

    protected override arranged(): void {
        const { width, height } = this.bounds
        this.hand.fixedSize = this.#scrolls(width) ? null : { width, height: this.#sizes().tallest }
        this.place(this.#scroll, this.#rect.set(0, 0, width, height))
    }


    readonly #scroll: Scroll
    readonly #rect = new Rect()

    /** Does it scroll at a width: the options too wide for it, or some that the hand would hide? */
    #scrolls(width: number): boolean {
        return this.hand.scrolls(width) || !this.hand.showsAll(width)
    }

    /** The sizes its options ask for, measured one by one, since the size of the hand may be fixed. */
    #sizes(): { readonly total: number, readonly tallest: number } {
        const hints = this.hand.children.map(option => option.measure(Infinity))
        const widths = hints.map(hint => hint.preferredWidth)
        const gaps = Math.max(0, hints.length - 1) * this.hand.gap
        return {
            total: widths.reduce((sum, width) => sum + width, gaps),
            tallest: Math.max(0, ...hints.map(hint => hint.preferredHeight)),
        }
    }
}

/**
 * An option of a choice: its content, leaning side to side, grown under the pointer, picked by click,
 * framed once picked.
 */
class ChoiceOption extends Tilt {


    /** What a click does, nothing when none. */
    public onPick: (() => void)|null = null

    /** What the pointer coming over it or leaving does, nothing when none. */
    public onHover: ((over: boolean) => void)|null = null

    constructor(
        content: Component,

        /** Where in its wobble it starts, in radians. */
        public readonly phase: number,

        /** The frame around it once picked, and its width, none for none. */
        picked: { readonly frame: NineSlice, readonly width: number }|null,
    ){
        super({ angle: WOBBLE_ANGLE, scale: HOVER_SCALE })
        if(picked){
            this.#frame = new PickedFrame(picked.frame, picked.width)
            this.#frame.content = content
            this.content = this.#frame
        } else {
            this.content = content
        }
    }


    /** Is it the option picked in its step? */
    public get picked(): boolean { return this.#picked }

    public set picked(picked: boolean){
        this.#picked = picked
        if(this.#frame) this.#frame.shown = picked
    }


    protected override get interactive(): boolean { return true }

    public override get holdsPointer(): boolean { return true }

    protected override arranged(): void {
        super.arranged()
        this.ticking = true
    }

    protected override handle(event: UiEvent): void {
        if(event.type !== "pointer-down" || event.button !== 0) return
        event.consume()
        this.onPick?.()
    }

    protected override hoverChanged(): void {
        this.onHover?.(this.hovered)
    }

    protected override tick(dt: number): void {
        this.#time += dt
        const ease = Math.min(1, GROW_RATE * dt)
        this.#sway += ((this.hovered ? 0 : 1) - this.#sway) * ease
        const swing = Math.sin(2 * Math.PI * this.#time / WOBBLE_PERIOD + this.phase)
        this.angle = WOBBLE_ANGLE * this.#sway * swing
        const goal = this.hovered ? HOVER_SCALE : this.#picked ? PICKED_SCALE : 1
        const next = this.scale + (goal - this.scale) * ease
        this.scale = Math.abs(goal - next) < GROW_SNAP ? goal : next
    }


    #picked = false

    /** The frame around its content, none when the choice frames nothing. */
    readonly #frame: PickedFrame|null = null

    /** How long it has wobbled, in seconds. */
    #time = 0

    /** How much of its wobble it plays: none while under the pointer, all once it left. */
    #sway = 1
}

/** The room around an option of a choice, and the frame drawn in it while the option is picked. */
class PickedFrame extends ContentContainer {


    constructor(
        public readonly frame: NineSlice,

        /** The room around the option, in virtual pixels. */
        public readonly width: number,
    ){
        super()
    }


    /** Is the frame drawn? */
    public get shown(): boolean { return this.#shown }

    public set shown(shown: boolean){
        if(shown === this.#shown) return
        this.#shown = shown
        this.invalidate()
    }


    protected computeHint(maxWidth: number): SizeHint {
        const content = this.content
        const hint = content?.visible ? content.measure(maxWidth - 2 * this.width) : EMPTY_HINT
        return paddedHint(hint, 2 * this.width, 2 * this.width)
    }

    protected override arranged(): void {
        const content = this.content
        if(!content?.visible) return
        const { width, height } = this.bounds
        const room = this.width
        this.#rect.set(room, room, Math.max(0, width - 2 * room), Math.max(0, height - 2 * room))
        this.place(content, this.#rect)
    }

    protected paint(painter: Painter): void {
        if(!this.#shown) return
        const { width, height } = this.bounds
        this.frame.draw(painter, 0, 0, width, height)
    }


    #shown = false
    readonly #rect = new Rect()
}
