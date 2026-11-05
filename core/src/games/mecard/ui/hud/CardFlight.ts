import type { Painter, Sprite } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Rect } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { Card } from "../../sim/card/Card"

import { CARD_LOOKS, CardView } from "./CardView"

const WHITE = new Color(1, 1, 1)

/** How narrow a card turning is drawn at least, as a share of its width: never quite gone. */
const THINNEST = 0.05

/**
 * A card being drawn, over the whole interface: it leaves its pile from its back, turns over on the way, and
 * lands face up on its place in the hand.
 */
export class CardFlight extends CardView {


    constructor(
        theme: Theme,
        card: Card,

        /** The back of a card, none until it is loaded. */
        public readonly back: Sprite|null,

        /** Where it leaves from, none for a card from elsewhere: it then comes up from its place. */
        public readonly from: Component|null,

        /** Its place in the hand. */
        public readonly to: Component,

        /** How far it went, from 0 to 1. */
        public readonly share: () => number,
    ){
        super(theme, card, "hand")
    }


    protected override get interactive(): boolean { return false }

    protected override arranged(): void {
        this.ticking = true
    }

    protected override tick(): void {
        this.invalidate()
    }

    protected override paint(painter: Painter): void {
        const to = this.#to
        if(!this.to.areaOnLayer(to)) return
        const from = this.from?.areaOnLayer(this.#from) ? this.#from : to
        const share = Math.min(1, Math.max(0, this.share()))
        const x = from.x + (to.x - from.x) * share
        const y = from.y + (to.y - from.y) * share
        const { width, height } = to
        // Its width goes through nothing half way, where it shows its other side.
        const turned = Math.max(THINNEST, Math.abs(1 - 2 * share))
        painter.push()
        painter.translate(x + width * (1 - turned) / 2, y)
        painter.scale(turned, 1)
        if(share >= 0.5) this.paintFace(painter, width, height)
        else this.#paintBack(painter, width, height)
        painter.pop()
    }


    readonly #from = new Rect()
    readonly #to = new Rect()

    #paintBack(painter: Painter, width: number, height: number): void {
        if(!this.back){
            this.paintFace(painter, width, height, null)
            return
        }
        painter.scale(width / this.back.width, height / this.back.height)
        painter.setTint(WHITE)
        painter.sprite(this.back, 0, 0)
    }
}

/** How much room a flight is given: all of it, so the card can be drawn anywhere. */
export function flightSize(size: { readonly width: number, readonly height: number }): typeof size {
    const { width, height } = CARD_LOOKS.hand
    return { width: Math.max(size.width, width), height: Math.max(size.height, height) }
}
