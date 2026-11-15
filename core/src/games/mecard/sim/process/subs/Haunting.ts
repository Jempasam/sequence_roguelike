import { Vector2 } from "../../base/Vector2"
import type { PlugContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"

import { tieTo } from "./Links"

/** How far a haunting unit stands behind its host, in meters, between the bodies. */
const HAUNT_GAP = 0.1

/** How far a unit has to be from where it was put for it to have moved on its own, in meters. */
const MOVED_SLACK = 1e-3

/**
 * A unit connected behind another until the end of the round: it follows each move and turn of its host,
 * standing behind it and facing as it does. Each step it plays, it plays from the place of its host, facing
 * as it does, then goes back behind. A step that moves it on its own sets it free where it ends. Over when the
 * host dies.
 */
export class Haunting extends AbstractProcess {


    constructor(
        /** The unit it is connected to. */
        public readonly host: Unit,
    ){
        super("hantise", visual("processes/haunting", { color: [0.65, 0.75, 1] }),
            "Reste derrière l'unité à laquelle tu es connecté, la suit quand elle bouge ou se tourne, et joue tes cartes depuis sa place, comme elle est tournée.",
        )
    }


    public override init(ctx: PlugContext): void {
        const { battle, unit, hold } = ctx
        const { host } = this
        tieTo(ctx, host, this, "tethers/laser")
        let busy = false
        let casting = false
        /** Where the unit stands behind its host, as the host stands and faces now. */
        const behind = (): Vector2 => host.position.minus(host.direction.times(host.radius + unit.radius + HAUNT_GAP))
        const settle = (): void => {
            busy = true
            try {
                battle.leap(unit, behind())
                battle.turn(unit, host.direction)
            } finally {
                busy = false
            }
        }
        settle()
        hold(battle.signals.moved.add(event => {
            if(event.unit !== host || busy || casting || !unit.alive) return
            settle()
        }))
        hold(unit.stepStarted.add(() => {
            if(!host.alive) return
            busy = true
            casting = true
            try {
                battle.leap(unit, host.position)
                battle.turn(unit, host.direction)
            } finally {
                busy = false
            }
        }))
        hold(unit.stepEnded.add(() => {
            if(!casting) return
            casting = false
            if(!host.alive) return
            if(unit.position.distance(host.position) > MOVED_SLACK){
                battle.events.push({ type: "status", unit, text: "hantise rompue" })
                battle.endProcess(unit, this)
                return
            }
            settle()
        }))
    }
}
