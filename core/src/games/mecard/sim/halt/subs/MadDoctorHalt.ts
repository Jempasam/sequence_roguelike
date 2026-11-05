import { concat } from "../../../../../semantic"
import type { Run } from "../../run/Run"
import type { HaltContext } from "../HaltContext"
import type { HaltType } from "../HaltType"
import { haltPnj, sceneLook } from "../SceneLook"
import { DOOR_TRANSITION } from "../transitions"
import { AbstractHalt } from "./AbstractHalt"
import { UNIT } from "../../base/keywords"

/** What the mad doctor says of itself. */
const LINE = ["Deux ", UNIT.as("unités"), " ? Sur ma table, elles n'en feront plus qu'une !"]

/** How the mad doctor looks. */
const LOOK = sceneLook(13, 31, 23, [
    "mecard/travel/mad-doctor/1.png", "mecard/travel/mad-doctor/2.png", "mecard/travel/mad-doctor/3.png",
    "mecard/travel/mad-doctor/4.png", "mecard/travel/mad-doctor/5.png",
], "mecard/travel/mad-doctor/border.png", haltPnj("madDoctor", [0.3, 0.9, 0.6], [0.2, 0.2, 0.25], { arrive: "fear" }))

/** The mad doctor: two characters of the party merged into one. */
export class MadDoctorHalt extends AbstractHalt {


    constructor(run: Run){
        super(MAD_DOCTOR_HALT, run, LINE, LOOK)
    }


    public start(ctx: HaltContext): void {
        const { run } = this
        if(run.heroes.length < 2){
            ctx.tell(["Le Docteur Fou a besoin de deux ", UNIT.as("unités"), "."])
            return
        }
        const first = (): void => ctx.hero(["La première ", UNIT], one => {
            ctx.hero(concat(one, " avec qui ?"), other => {
                ctx.confirm("L'opération :", {
                    cards: [], text: concat(one, " et ", other, " deviendront une seule ", UNIT, "."),
                }, "Opérer", () => {
                    this.impact()
                    ctx.tell(concat(run.merge(one, other), " est né."))
                }, { back: first })
            }, { among: hero => hero !== one })
        })
        first()
    }
}

/** The sort of the mad doctor. */
export const MAD_DOCTOR_HALT: HaltType = {
    name: "Docteur Fou",
    description: ["Greffe deux ", UNIT.as("unités"), " en une seule."],
    code: "DF",
    icon: "mecard/travel/mad-doctor/logo.png",
    transition: DOOR_TRANSITION,
    create: run => new MadDoctorHalt(run),
}
