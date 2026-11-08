import { Vector2 } from "../../base/Vector2"
import type { PlugContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"

/** How wide the laser between two allies cuts, in meters. */
const LASER_WIDTH = 0.3

/** Tie a process to a partner: the two drawn tied, the process over once the partner dies. */
function tieTo({ battle, unit, hold }: PlugContext, partner: Unit, process: AbstractProcess, look: string): void {
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
        super("lien laser", visual("processes/laser_link", { color: [1, 0.3, 0.3] }))
    }


    public override init(ctx: PlugContext): void {
        const { battle, unit, hold } = ctx
        tieTo(ctx, this.ally, this, "tethers/laser")
        hold(battle.unitStepped.add(() => {
            const way = { kind: "segment", from: unit.position, to: this.ally.position, width: LASER_WIDTH } as const
            for(const target of battle.unitsIn(way, unit)){
                if(target.team !== unit.team) target.hearts.damage(this.damage, "physical", unit)
            }
        }))
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
        super("accroche", visual("processes/hook", { color: [0.75, 0.65, 0.45] }))
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
        hold(battle.signals.moved.add(({ unit: moved }) => {
            if(moved !== unit || following || !ally.alive) return
            following = true
            try {
                const wanted = unit.position.plus(Vector2.relative(unit.direction, ahead, side))
                const way = wanted.minus(ally.position)
                const toward = way.normalized
                if(toward) battle.move(ally, toward, way.length, true)
                battle.turn(ally, Vector2.relative(unit.direction, facingAhead, facingSide))
            } finally {
                following = false
            }
            if(ally.position.distance(unit.position) > this.reach){
                battle.events.push({ type: "status", unit, text: "accroche brisée" })
                battle.endProcess(unit, this)
            }
        }))
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
        super("chaîne de fer", visual("processes/iron_chain", { color: [0.6, 0.6, 0.65] }))
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
            battle.move(unit, toward, this.pull, true)
            battle.move(target, toward.opposite, this.pull, true)
        }))
    }
}
