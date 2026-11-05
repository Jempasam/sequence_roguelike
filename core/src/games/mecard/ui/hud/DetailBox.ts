import type { InputFrame } from "../../../../engine/input"
import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Panel, Paragraph, Scroll } from "../../../../engine/ui"
import type { Rect, Theme } from "../../../../engine/ui"
import type { Text } from "../../../../semantic"

import { explanationOf } from "../look/explanations"

/** The mouse button that locks and unlocks the box. */
const LOCK_BUTTON = 2

/** The color of the frame around a locked box. */
const LOCK_FRAME = new Color(1, 1, 1)

/** How thick that frame is, in virtual pixels: the room is kept for it, so locking moves nothing. */
const FRAME_WIDTH = 1

/** How a box is set up beyond its theme. */
export interface DetailBoxOptions {
    /** The color of its text. */
    readonly color: Readonly<Color>

    /** Does its text scroll, in a room shorter than what it may say? No by default. */
    readonly scrolled?: boolean
}

/**
 * What tells about what the pointer hovers, or a hint. A right click locks it on what it says, in a white
 * frame, and a second one lets it go.
 *
 * @remarks
 * Locked, it shows nothing else, but the explanation of what the pointer hovers in its own text, until the
 * pointer leaves that word. A right click on such a word locks the box on the explanation, which is a text
 * like any other: so a card held by a card is read by going down into it, and the box needs no pile.
 *
 * The explanation takes the place of the text, so the word it comes from is no more shown under the pointer.
 * The box keeps where that word was, and shows the explanation as long as the pointer stays there. It is told
 * of the pointer each frame by {@link DetailBox.frame}, so it sees it leave whatever lies around.
 */
export class DetailBox extends Panel {


    constructor(theme: Theme, options: DetailBoxOptions){
        super(theme, { background: null, padding: FRAME_WIDTH, interactive: false })
        this.#paragraph = new Paragraph(theme, "", {
            color: options.color,
            onLink: (link, area) => this.#hoverOwn(link, area),
        })
        if(options.scrolled){
            this.#scroll = new Scroll(theme, { width: FRAME_WIDTH, height: FRAME_WIDTH })
            this.#scroll.content = this.#paragraph
            this.content = this.#scroll
        } else {
            this.content = this.#paragraph
        }
    }


    /** Is it locked on what it says? */
    public get locked(): boolean { return this.#locked !== null }

    /** What it says now. */
    public get text(): Text { return this.#paragraph.text }

    /** What it says while nothing is hovered. */
    public get hint(): Text { return this.#hint }

    public set hint(hint: Text){
        this.#hint = hint
        this.#show()
    }

    /** Say what is hovered, none when nothing is. Locked, it only keeps it for when it is let go. */
    public tell(text: Text|null): void {
        this.#hovered = text
        this.#show()
    }

    /** Hear of a link hovered in a text outside it: its explanation is told as anything hovered is. */
    public readonly hearLink = (link: object|null): void => {
        this.tell(link ? explanationOf(link) ?? null : null)
    }

    /**
     * Read a frame of the input: the pointer may have left the word explained, and a right click anywhere
     * locks or lets go, even on what took the click.
     *
     * @param x - Where the pointer is on the layers, in virtual pixels.
     */
    public frame(input: InputFrame, x: number, y: number): void {
        if(this.#explained && !this.#explained.area.containsPoint(x, y)){
            this.#explained = null
            this.#show()
        }
        for(const event of input.events){
            if(event.type === "pointer-down" && event.button === LOCK_BUTTON) this.#toggle()
        }
    }


    protected override paint(painter: Painter): void {
        super.paint(painter)
        if(!this.locked) return
        const { width, height } = this.bounds
        painter.push()
        painter.setWhitePixel(this.theme.white)
        painter.setTint(LOCK_FRAME)
        painter.rect(0, 0, width, FRAME_WIDTH)
        painter.rect(0, height - FRAME_WIDTH, width, FRAME_WIDTH)
        painter.rect(0, 0, FRAME_WIDTH, height)
        painter.rect(width - FRAME_WIDTH, 0, FRAME_WIDTH, height)
        painter.pop()
    }


    readonly #paragraph: Paragraph
    readonly #scroll: Scroll|null = null
    #hint: Text = ""

    /** What is hovered, none when nothing is. */
    #hovered: Text|null = null

    /** What it is locked on, none when it is free. */
    #locked: Text|null = null

    /** The explanation of a word of its text, and where the word lies on the layers, none when none. */
    #explained: { readonly text: Text, readonly area: Readonly<Rect> }|null = null

    /** Hear that the pointer came over a link of its own text. */
    #hoverOwn(link: object|null, area: Readonly<Rect>|null): void {
        if(this.#explained || !link || !area) return
        const text = explanationOf(link)
        if(text === undefined) return
        this.#explained = { text, area }
        this.#show()
    }

    #toggle(): void {
        if(this.#explained){
            this.#locked = this.#explained.text
            this.#explained = null
        } else if(this.#locked !== null) {
            this.#locked = null
        } else {
            this.#locked = this.#hovered
        }
        this.#show()
        this.invalidate()
    }

    /** Show what it has to say, in order of what matters. */
    #show(): void {
        const text = this.#explained?.text ?? this.#locked ?? this.#hovered ?? this.#hint
        if(text === this.#paragraph.text) return
        this.#paragraph.text = text
        if(this.#scroll) this.#scroll.offset = 0
    }
}
