import { visual } from "../../base/Visual"
import type { PlugContext } from "../../battle/Action"
import { DEMONIC } from "../../status/subs/DemonEnergy"
import { AbstractProcess } from "../AbstractProcess"

/** Weakening blows: each wound the unit takes opens another, an echo of the strength of the one who weakened it. */
export class WeakeningBlows extends AbstractProcess {


    constructor(
        /** How many hearts each wound adds. */
        public readonly bonus: number,
    ){
        super(`coups affaiblissants +${bonus}`, visual("processes/weakening_blows", { color: [0.8, 0.5, 0.4] }),
            `Chaque blessure subie en ouvre une autre de ${bonus} cœur${bonus > 1 ? "s" : ""}.`,
        )
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
        super("rancune", visual("processes/grievance", { color: [0.85, 0.2, 0.4] }),
            "Chaque blessure subie nourrit son énergie démoniaque.",
        )
    }


    public override init({ battle, unit, hold }: PlugContext): void {
        hold(unit.hearts.onDamage.add(() => battle.applyStatus(unit, DEMONIC, 1)))
    }
}
