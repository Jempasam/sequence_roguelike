import { Color } from "../../../../engine/math"
import { Box, Image } from "../../../../engine/ui"
import type { Component } from "../../../../engine/ui"
import type { Hero } from "../../sim/run/Hero"

import type { UnitSprites } from "../look/UnitSprites"
import { isDead } from "./historyFormat"

/** What a hero that fell is tinted: grey. */
const FALLEN_TINT = new Color(0.45, 0.45, 0.5)

/** The heads of a party, side by side: the sprite of each hero, grey for one that fell. */
export function partyHeads(sprites: UnitSprites, heroes: readonly Hero[]): Component {
    const row = new Box("row", { gap: 2, align: "center" })
    for(const hero of heroes){
        const sprite = sprites.of(hero.sprite)
        if(!sprite) continue
        row.add(new Image(sprite, isDead(hero) ? { tint: FALLEN_TINT } : {}))
    }
    return row
}
