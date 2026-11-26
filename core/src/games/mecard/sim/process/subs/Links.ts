import { Vector2 } from "../../base/Vector2"
import type { PlugContext } from "../../battle/Action"
import { HeartCount } from "../../battle/words"
import type { Area } from "../../battle/Area"
import type { Battle } from "../../battle/Battle"
import type { GlideSignal } from "../../battle/mecanic/relocation/signals"
import type { Indicator, Preview } from "../../battle/preview/Preview"
import type { PreviewContext } from "../../battle/preview/PreviewContext"
import * as Previews from "../../battle/preview/Previews"
import { MOVE_COLOR, MOVE_WIDTH } from "../../battle/previewColors"
import type { Unit } from "../../battle/Unit"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"
import { DamageType } from "../../battle/DamageType"
import * as Areas from "../../battle/area/Areas"
import { SHOVED } from "../../battle/mecanic/push/signals"
import { TURN } from "../../battle/mecanic/turn/keyword"
import { TURNED } from "../../battle/mecanic/turn/signals"
import { WALKED } from "../../battle/mecanic/walk/signals"
import * as Turn from "../../battle/mecanic/turn"
import * as Walk from "../../battle/mecanic/walk"

/** How wide the laser between two allies cuts, in meters. */
const LASER_WIDTH = 0.3

/** Tie a process to a partner: the two drawn tied, the process over once the partner dies. */
export function tieTo({ battle, unit, hold }: PlugContext, partner: Unit, process: AbstractProcess, look: string): void {
    hold(battle.tether(unit, partner, visual(look)))
    hold(partner.onDeath.add(() => battle.endProcess(unit, process)))
}

/** A laser to an ally until the end of the round: each end of a turn, it burns the enemies across it. */
export class LaserLink extends AbstractProcess {


    constructor(
        /** The ally at the other end. */
        public readonly ally: Unit,

        /** How many hearts it takes from each enemy across it, each end of a turn. */
        public readonly damage: number,
    ){
        super("lien laser", visual("processes/laser_link", { color: [1, 0.3, 0.3] }),
            ["À chaque fin de tour, un laser relie l'allié : les ennemis en travers perdent ", new HeartCount(damage), "."],
        )
    }


    public override init(ctx: PlugContext): void {
        const { battle, unit, hold } = ctx
        tieTo(ctx, this.ally, this, "tethers/laser")
        hold(battle.unitStepped.add(() => {
            const way = Areas.line(unit.position, this.ally.position, LASER_WIDTH)
            for(const target of this.#across(battle, unit, way)) target.hearts.damage(this.damage, DamageType.PHYSICAL, unit)
        }))
    }

    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const way = Areas.line(unit.position, this.ally.position, LASER_WIDTH)
        return Previews.still(pose, ...Previews.strike([way], this.#across(battle, unit, way)))
    }


    /** The enemies the laser cuts. */
    #across(battle: Battle, unit: Unit, way: Area): Unit[] {
        return battle.fetch(way, unit).filter(target => target.team !== unit.team)
    }
}

/**
 * A hook on an ally until the end of the round: as the unit moves or turns, the ally keeps where it stands
 * and faces next to it, as far as nothing is in its way. Too far once moved, the hook breaks.
 */
export class Hook extends AbstractProcess {


    constructor(
        /** The ally hooked. */
        public readonly ally: Unit,

        /** How far the ally may stand from the unit, from center to center, before the hook breaks. */
        public readonly reach: number,
    ){
        super("accroche", visual("processes/hook", { color: [0.75, 0.65, 0.45] }),
            [
                "Quand l'unité bouge ou ", TURN.as("tourne"), ", l'allié accroché garde sa place et son orientation par ",
                "rapport à elle. L'accroche se brise s'il s'éloigne trop.",
            ],
        )
    }


    public override init(ctx: PlugContext): void {
        const { battle, unit, hold } = ctx
        const { ally } = this
        tieTo(ctx, ally, this, "tethers/grapple")
        // Where the ally stands and faces in the frame of the unit, ahead and to its right.
        const offset = ally.position.minus(unit.position)
        const ahead = offset.dot(unit.direction)
        const side = offset.dot(unit.direction.right)
        const facingAhead = ally.direction.dot(unit.direction)
        const facingSide = ally.direction.dot(unit.direction.right)
        let following = false
        const follow = ({ unit: moved }: GlideSignal): void => {
            if(moved !== unit || following || !ally.alive) return
            following = true
            try {
                const wanted = unit.position.plus(Vector2.relative(unit.direction, ahead, side))
                const way = wanted.minus(ally.position)
                const toward = way.normalized
                if(toward) Walk.move(battle, ally, toward, way.length, true)
                Turn.turn(battle, ally, Vector2.relative(unit.direction, facingAhead, facingSide))
            } finally {
                following = false
            }
            if(ally.position.distance(unit.position) > this.reach){
                battle.events.push({ type: "status", unit, text: "accroche brisée" })
                battle.endProcess(unit, this)
            }
        }
        for(const key of [WALKED, SHOVED, TURNED]) hold(battle.observers.of(key).add(follow))
    }
}

/**
 * An iron chain to an enemy until the end of the round: each end of a turn, when the two stand too far apart,
 * each is pulled toward the other.
 */
export class IronChain extends AbstractProcess {


    constructor(
        /** The enemy chained. */
        public readonly target: Unit,

        /** How far apart they may stand before the chain pulls, from center to center. */
        public readonly slack: number,

        /** How far each is pulled, in meters. */
        public readonly pull: number,
    ){
        super("chaîne de fer", visual("processes/iron_chain", { color: [0.6, 0.6, 0.65] }),
            "À chaque fin de tour, si l'ennemi enchaîné est trop loin, chacun est tiré vers l'autre.",
        )
    }


    public override init(ctx: PlugContext): void {
        const { battle, unit, hold } = ctx
        const { target } = this
        tieTo(ctx, target, this, "tethers/iron_chain")
        hold(battle.unitStepped.add(() => {
            if(!target.alive || target.position.distance(unit.position) <= this.slack) return
            const toward = target.position.minus(unit.position).normalized
            if(!toward) return
            // Pulled as a push moves, but running into the other is no blow: neither is wounded by the pull.
            Walk.move(battle, unit, toward, this.pull, true)
            Walk.move(battle, target, toward.opposite, this.pull, true)
        }))
    }

    /** The pull at the end of a turn when the two stand too far apart, each toward the other. */
    public preview({ pose }: PreviewContext): Preview {
        const { target } = this
        const toward = target.position.minus(pose.position).normalized
        if(!target.alive || !toward || target.position.distance(pose.position) <= this.slack){
            return Previews.still(pose)
        }
        const pulled = (from: Vector2, way: Vector2): Indicator => {
            return Previews.arrow([from, from.plus(way.times(this.pull))], MOVE_WIDTH, MOVE_COLOR)
        }
        return Previews.still(pose, pulled(pose.position, toward), pulled(target.position, toward.opposite))
    }
}
