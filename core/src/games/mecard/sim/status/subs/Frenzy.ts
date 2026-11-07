import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { StatusType } from "../Status"

/** A frenzy: the unit turns on whoever is closest, before each of its steps. */
export const FRENZIED = new StatusType("frénésie", rgba(1, 0.45, 0.1), "neutral", level => new Frenzy(level))

/** Frenzied: before each of its steps, it turns straight at the closest other unit, ally or enemy. */
export class Frenzy extends RoundStatus {


    public readonly type: StatusType = FRENZIED

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [unit.stepStarted.add(() => {
            let closest: { distance: number, toward: typeof unit.direction }|null = null
            for(const other of battle.living){
                if(other === unit) continue
                const offset = other.position.minus(unit.position)
                const toward = offset.normalized
                if(toward && (!closest || offset.length < closest.distance)){
                    closest = { distance: offset.length, toward }
                }
            }
            if(closest) battle.turn(unit, closest.toward)
        })]
    }
}
