import { rgba } from "../../base/Rgba"
import type { PlugContext } from "../../battle/Action"
import { DEMONIC } from "../../status/subs/DemonEnergy"
import { AbstractProcess } from "../AbstractProcess"

/** Weakening blows: each wound the unit takes opens another, an echo of the strength of the one who weakened it. */
export class WeakeningBlows extends AbstractProcess {


    constructor(
        /** How many hearts each wound adds. */
        public readonly bonus: number,
    ){
        super(`coups affaiblissants +${bonus}`, "weakening", rgba(0.8, 0.5, 0.4))
    }


    public override init({ unit, hold }: PlugContext): void {
        // An echo is not a wound, so these never answer each other.
        hold(unit.hearts.onDamage.add(({ nature, source }) => {
            unit.hearts.echo(this.bonus, nature, source)
        }))
    }
}

/** A grievance: each wound the unit takes feeds its demonic energy, for the round. */
export class Grievance extends AbstractProcess {


    constructor(){
        super("rancune", "grievance", rgba(0.85, 0.2, 0.4))
    }


    public override init({ battle, unit, hold }: PlugContext): void {
        hold(unit.hearts.onDamage.add(() => battle.applyStatus(unit, DEMONIC, 1)))
    }
}
