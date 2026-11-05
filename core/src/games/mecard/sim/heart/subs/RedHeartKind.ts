import { rgba } from "../../base/Rgba"
import type { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"
import { KeptHeartRule } from "./KeptHeartRule"

/** The hearts of life: healed, and kept as empty places once lost. */
export class RedHeartKind extends AbstractHeartKind {


    constructor(){
        super(
            "rouge", "Le cœur de vie : se soigne, et reste comme contenant vide une fois perdu.",
            rgba(0.9, 0.15, 0.2), true,
        )
    }


    public create(): HeartRule { return new KeptHeartRule(this) }
}

export const RED_HEART = new RedHeartKind()
