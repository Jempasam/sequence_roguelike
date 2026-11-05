import { rgba } from "../../base/Rgba"
import { damage as damageText, meters } from "../../battle/words"
import type { HeartLostEvent } from "../../battle/events"
import { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"
import { UNIT } from "../../base/keywords"

/** How far the blast of the explosive heart of the catalog reaches, in meters. */
const BLAST_RADIUS = 1.2

/** How many hearts the blast of the explosive heart of the catalog takes. */
const BLAST_DAMAGE = 1

/** A heart that blows up once lost, sparing its unit. */
export class ExplosiveHeartKind extends AbstractHeartKind {


    constructor(
        /** How far its blast reaches, in meters. */
        public readonly radius: number,

        /** How many hearts its blast takes from each unit. */
        public readonly blast: number,
    ){
        super(
            "explosif",
            ["Perdu, il explose à ", meters(radius), " autour de toi : ", damageText(blast, "physical"), " à chaque ", UNIT, ", sauf toi."],
            rgba(1, 0.6, 0.15),
        )
    }


    public create(): HeartRule { return new ExplosiveHeartRule(this) }
}

/** The rules of the explosive hearts: a blast around their unit, once lost. */
class ExplosiveHeartRule extends HeartRule {


    constructor(
        public override readonly kind: ExplosiveHeartKind,
    ){
        super(kind)
    }


    public override onLost({ battle, unit, heart, source }: HeartLostEvent): void {
        battle.signals.notifyHeart.notify({ unit, heart })
        const area = { kind: "circle", center: unit.position, radius: this.kind.radius } as const
        battle.explode(area, this.kind.blast, source === unit ? null : unit, unit)
    }
}

export const EXPLOSIVE_HEART = new ExplosiveHeartKind(BLAST_RADIUS, BLAST_DAMAGE)
