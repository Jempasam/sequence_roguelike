import { rgba } from "../../base/Rgba"
import { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"
import { RED_HEART } from "./RedHeartKind"

/** A temporary heart: lost before the red ones, never healed. */
export class ShieldHeartKind extends AbstractHeartKind {


    constructor(){
        super("bouclier", ["Perdu avant tout cœur ", RED_HEART, ", jamais soigné."], rgba(0.55, 0.8, 1))
    }


    public create(): HeartRule { return new HeartRule(this) }
}

export const SHIELD_HEART = new ShieldHeartKind()
