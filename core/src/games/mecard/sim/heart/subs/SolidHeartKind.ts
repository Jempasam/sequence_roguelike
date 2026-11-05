import { rgba } from "../../base/Rgba"
import { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"

/** Hearts no wound takes: they block every one reaching them. */
export class SolidHeartKind extends AbstractHeartKind {


    constructor(){
        super("solide", "Ne prend aucun dégât : bloque tous ceux qui l'atteignent.", rgba(0.6, 0.6, 0.62))
    }


    public create(): HeartRule { return new SolidHeartRule(this) }
}

/** The rules of the solid hearts: refuse every wound. */
class SolidHeartRule extends HeartRule {


    public override doDamage(): boolean {
        return false
    }
}

export const SOLID_HEART = new SolidHeartKind()
