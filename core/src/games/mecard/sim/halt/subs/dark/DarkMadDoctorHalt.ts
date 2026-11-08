import { concat } from "../../../../../../semantic"
import { UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { Monster } from "../../../catalog/monsters"
import type { Run } from "../../../run/Run"
import type { HaltContext } from "../../HaltContext"
import type { HaltType } from "../../HaltType"
import { sceneLook } from "../../SceneLook"
import { DOOR_TRANSITION } from "../../transitions"
import { AbstractHalt } from "../AbstractHalt"
import { DARK_COLOR, DARK_MASK } from "../halt_common"
import { monsterShown, offeredMonsters } from "./monster_pool"

/** The monster surgeon: a character of the party grafted with a monster among some, as the mad doctor grafts two. */
export class DarkMadDoctorHalt extends AbstractHalt {


    constructor(run: Run){
        super(DARK_MAD_DOCTOR_HALT, run,
            ["Une ", UNIT, " et un monstre ? Sur ma table, ils n'en feront plus qu'un !"],
            sceneLook(13, 31, 23, "mecard/travel/mad-doctor"),
            {
                hat: "doctorHat",
                clothes: DARK_COLOR,
                hatColor: DARK_COLOR,
                mask: DARK_MASK,
                maskColor: DARK_COLOR,
                cues: { arrive: "fear" },
            },
        )
        this.#monsters = offeredMonsters(run.rng)
    }


    public start(ctx: HaltContext): void {
        const { run } = this
        const first = (): void => ctx.hero(["Quelle ", UNIT, " ?"], one => {
            ctx.offer(concat(one, " avec quel monstre ?"), this.#monsters, monster => monsterShown(monster), monster => {
                this.impact()
                ctx.tell(concat(run.graft(one, monster), " est né."))
            }, { back: first })
        })
        first()
    }


    /** The monsters offered. */
    readonly #monsters: readonly Monster[]
}

/** The sort of the monster surgeon. */
export const DARK_MAD_DOCTOR_HALT: HaltType = {
    id: "darkMadDoctor",
    name: "Chirurgien des monstres",
    description: ["Greffe une ", UNIT, " avec un monstre parmi trois."],
    icon: visual("travel/mad-doctor/logo", { letter: "DF!" }),
    glow: DARK_COLOR,
    transition: DOOR_TRANSITION,
    create: run => new DarkMadDoctorHalt(run),
}
