import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import type { Element } from "../../element/Element"
import type { ElementType } from "../../status/StatusVariants"
import { HazardStatus } from "../Hazard"

/** How far apart two bodies may stand and still touch, in meters: a body stops a stride short of another. */
const CONTACT_SLACK = 0.08

/**
 * What a body called by an element does on contact: each body it comes to touch, or that comes to touch it,
 * suffers it once a round. Once a round so what it remembers is gone at each rest: a save writes none of it.
 */
export abstract class ContactHazard extends HazardStatus {


    constructor(
        public readonly type: ElementType,
        level: number,
    ){
        super(level)
    }


    /** The element whose negative it applies. */
    public get element(): Element { return this.type.element }


    /** What befalls a body touching it, for the unit that called it. */
    protected abstract touch(ctx: UnitContext, body: Unit, target: Unit): void

    protected plug({ battle, unit }: UnitContext): void {
        const touched = new Set<Unit>()
        const check = (other: Unit): void => {
            if(other === unit || !other.alive || !other.tangible || !other.touchable || touched.has(other)) return
            if(unit.position.distance(other.position) > unit.radius + other.radius + CONTACT_SLACK) return
            touched.add(other)
            this.touch({ battle, unit: unit.owner ?? unit }, unit, other)
        }
        this.hold(battle.unitMoved.add(({ unit: mover }) => {
            if(!unit.alive) return
            if(mover === unit) for(const other of battle.bodies) check(other)
            else check(mover)
        }))
        this.hold(battle.roundEnded.add(() => touched.clear()))
    }
}
