import { pick } from "../../../../../../../engine/particles"
import { between, colorOf, pictureOf, systemOf } from "../../scene/Grain"
import type { Grain } from "../../scene/Grain"
import type { Scene } from "../../scene/Scene"
import { following } from "../following"
import { anchorOf, emitPuff } from "../Puff"
import { Puppet } from "../Puppet"
import type { Choice } from "../selection"
import { Tracked } from "../Tracked"
import type { Emission } from "./aura"

/** The seconds the alarm of a unit woken up stays, and takes to fade at its end. */
const ALARM = 0.8
const FADE = 0.2

/** The seconds the alarm takes to pop up, how high it jumps as it does, and how far over the head it lies. */
const POP = 0.25
const JUMP = 4
const ABOVE = 8

/** The seconds kept past its longest time, for a unit that wakes up at the last frame. */
const SLACK = 0.2

/** What makes a doze. */
export interface DozeSpec {
    readonly among: Choice

    /** What a unit asleep gives off. */
    readonly snore: Emission

    /** What shows over its head when it wakes up. */
    readonly alarm: Grain

    /** The seconds it must be still for to fall asleep. */
    readonly still: number

    /** The most seconds it sleeps. */
    readonly longest: number
}

/**
 * A unit left still falls asleep. Its first move wakes it up with a start, an alarm over its head; one left
 * alone sleeps on until its time is over.
 */
export function doze(spec: DozeSpec): Scene {
    const { among, snore, alarm, still, longest } = spec
    const bedtime = still + longest
    const duration = bedtime + ALARM + SLACK
    return {
        playable: context => among(context).length > 0,
        create(context){
            const snoring = pictureOf(context, snore.grain)
            const alarming = pictureOf(context, alarm)
            const candidates = among(context)
            if(snoring === undefined || alarming === undefined || candidates.length === 0) return null
            const { random } = context
            const unit = new Tracked(pick(random, candidates))
            const start = new Puppet({
                system: systemOf(context, alarm), sprite: alarming, size: between(random, alarm.size),
                color: colorOf(random, alarm),
            }, duration)

            let asleep = false
            let woken: number|null = null
            let wait = 0
            return following(context, [unit], duration, (dt, age) => {
                if(unit.gone){
                    start.hide()
                    return false
                }

                // WAKE UP //
                if(asleep && woken === null && unit.moving) woken = age
                if(woken !== null){
                    const since = age - woken
                    const jump = Math.sin(Math.min(1, since / POP) * Math.PI) * JUMP
                    const { head } = unit.shown
                    const seen = Math.max(0, Math.min(1, (ALARM - since) / FADE))
                    return start.place({ x: head.x, y: head.y - ABOVE - jump }, seen, dt) && since < ALARM
                }

                // SLEEP //
                asleep ||= unit.stillFor >= still
                if(asleep){
                    wait -= dt
                    if(wait <= 0){
                        wait += snore.interval
                        emitPuff(context, snore, snoring, anchorOf(unit.shown, snore.anchor))
                    }
                }
                return age < bedtime
            })
        },
    }
}
