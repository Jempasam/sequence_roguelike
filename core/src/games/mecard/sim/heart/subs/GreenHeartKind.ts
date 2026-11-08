import { rgba } from "../../base/Rgba"
import { Heart } from "../Heart"
import { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"
import { RED_HEART } from "./RedHeartKind"

/** Hearts that turn into red ones: lost, each leaves a full red heart in its place. */
export class GreenHeartKind extends AbstractHeartKind {


    constructor(){
        super("vert", "Perdu, il devient un cœur rouge plein.", rgba(0.3, 0.8, 0.3))
    }


    public create(): HeartRule { return new GreenHeartRule(this) }
}

/** The rules of the green hearts: a full red heart takes the place of each one lost. */
class GreenHeartRule extends HeartRule {


    public override onReplacement(): Heart {
        return new Heart(RED_HEART)
    }
}

export const GREEN_HEART = new GreenHeartKind()
