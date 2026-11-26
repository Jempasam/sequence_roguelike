import type { SoundPlayer } from "../../../../engine/audio"
import type { Observable, Observer } from "../../sim/base/Observable"
import { Rng } from "../../sim/base/Rng"
import { Scope } from "../../../../lifetime"
import type { Battle } from "../../sim/battle/Battle"
import { BLINKED } from "../../sim/battle/mecanic/blink/signals"
import { LEAPED } from "../../sim/battle/mecanic/leap/signals"
import { SHOVED } from "../../sim/battle/mecanic/push/signals"
import { SWAPPED } from "../../sim/battle/mecanic/swap/signals"
import { TELEPORTED } from "../../sim/battle/mecanic/teleport/signals"
import { TURNED } from "../../sim/battle/mecanic/turn/signals"
import { BUMPED, WALKED } from "../../sim/battle/mecanic/walk/signals"
import type { Unit } from "../../sim/battle/Unit"
import type { Run } from "../../sim/run/Run"
import type { Forwarded } from "../forward/Forwarded"
import type { Cue } from "./Cue"
import { FIGHT_CUES, soundOfFight } from "./fightSounds"
import { HALT_CUES, soundOfHalt, soundOfImpact } from "./haltSounds"
import { soundOfStatus, STATUS_CUES } from "./statusSounds"
import {
    ACTION_VOICE_VOLUME, BATTLE_VOICE_DELAY, quieter, ROUND_VOICE_VOLUME, SPAWN_VOICE_VOLUME, UNIT_CUES,
    VOICE_CHANCE, voiceOf, voiceOfBattle,
} from "./unitSounds"

/** The channel the sounds of the journey and of the battles are played on. */
export const EFFECTS_CHANNEL = "effects"

/** The end of a visit or of a fight: a deep note. */
const END: Cue = { path: "mecard/sounds/guitare_grave.ogg", volume: 1 }

/** A step on the map. */
const STEP: Cue = { path: "mecard/sounds/tchi.wav", volume: 1.5 }

/** A card is drawn. */
const DRAW: Cue = { path: "mecard/sounds/card.wav", volume: 1.5 }

/** A card is played: a slap. */
const PLAY: Cue = { path: "mecard/sounds/card_play.ogg", volume: 1 }

/** A unit steps on the board. */
const BOARD_STEP: Cue = { path: "mecard/sounds/step.ogg", volume: 1 }

/** A unit turns on the spot, its place unchanged. */
const TURN: Cue = { path: "mecard/sounds/turn.ogg", volume: 1 }

/** A unit blinks across the board. */
const BLINK: Cue = { path: "mecard/sounds/blink.ogg", volume: 1 }

/** A unit is hurt for 1 or 2 hearts. */
const HIT_2: Cue = { path: "mecard/sounds/hit2.ogg", volume: 1 }

/** A unit is hurt for 3 or 4 hearts. */
const HIT_4: Cue = { path: "mecard/sounds/hit4.ogg", volume: 1 }

/** A unit is hurt for 5 to 8 hearts. */
const HIT_8: Cue = { path: "mecard/sounds/hit8.ogg", volume: 1 }

/** A unit is hurt for 9 hearts or more. */
const HIT_12: Cue = { path: "mecard/sounds/hit12.ogg", volume: 1 }

/** A unit loses hearts. */
const HEART_LOST: Cue = { path: "mecard/sounds/heart_lost.ogg", volume: 0.8 }

/** A unit is healed. */
const HEAL: Cue = { path: "mecard/sounds/heal.ogg", volume: 1 }

/** A unit loses a status. */
const STATUS_END: Cue = { path: "mecard/sounds/status_end.ogg", volume: 1 }

/** A unit appears. */
const APPEAR: Cue = { path: "mecard/sounds/spawn.ogg", volume: 1 }

/** A unit dies. */
const DEATH: Cue = { path: "mecard/sounds/death.ogg", volume: 1 }

/** Two units run into each other. */
const BUMP: Cue = { path: "mecard/sounds/bump.ogg", volume: 1 }

/** The chain of a unit cannot go on: too long, or a card cannot be built. */
const REFUSED: Cue = { path: "mecard/sounds/chain_overflow.ogg", volume: 1 }

/** A round starts: a light gong. */
const ROUND: Cue = { path: "mecard/sounds/round_start.ogg", volume: 1 }

/** Gold is gained: a coin. */
const GOLD: Cue = { path: "mecard/sounds/gold.ogg", volume: 1 }

/** The sounds of a blow, from the lightest: each is played up to the damage, in hearts, it is given. */
const HURTS: readonly { readonly upTo: number, readonly cue: Cue }[] = [
    { upTo: 2, cue: HIT_2 },
    { upTo: 4, cue: HIT_4 },
    { upTo: 8, cue: HIT_8 },
]

/** The sound of a blow of some hearts: the first that goes up to them, the heaviest beyond. */
function hurtCue(amount: number): Cue {
    return HURTS.find(({ upTo }) => amount <= upTo)?.cue ?? HIT_12
}

/** Every sound the link plays, loaded as it starts. */
const CUES: readonly Cue[] = [
    END, STEP, DRAW, PLAY, BOARD_STEP, TURN, BLINK, HIT_2, HIT_4, HIT_8, HIT_12, HEART_LOST, HEAL,
    STATUS_END, APPEAR, DEATH, BUMP, REFUSED, ROUND, GOLD, ...STATUS_CUES, ...HALT_CUES, ...FIGHT_CUES,
    ...UNIT_CUES,
]

/**
 * Tells the speakers what a run does: the sounds of its journey and of the battles it fights, played by a
 * {@link SoundPlayer}.
 *
 * @remarks
 * Made like a broadcaster, it reads the run and changes nothing of it: the run knows no sound. It follows
 * the battle being fought, and lets go of it when the next one comes. It plays each sound when the screen
 * plays what the event shows, told by a {@link Forwarded}, not when the run tells it: the run plays a round
 * out at once, the screen shows it after.
 */
export class RunSoundLink {


    /** The run it plays the sounds of, which may be another one later. */
    public get engine(): Run { return this.#engine }

    public set engine(run: Run){
        this.#unregisterObservers()
        this.#follow(run)
    }

    constructor(
        engine: Run,

        /** What plays the sounds. */
        public readonly player: SoundPlayer,

        /** What tells it the animations play, which the sounds follow. */
        public readonly forwarded: Forwarded,

        /** What draws the units that speak, apart from the run so that its battles stay the same. */
        public readonly voices: Rng = new Rng(engine.rng.state),
    ){
        this.#engine = engine
        player.preload(CUES.map(cue => cue.path))
        this.#follow(engine)
    }


    /** Stop playing the sounds of the run. */
    public dispose(): void {
        this.#unregisterObservers()
    }


    #engine: Run
    #observers = new Scope()
    #battleObservers: Observer[] = []

    /** The unit that plays first in each round the battle told and the screen has not shown yet. */
    #firstsOfRounds: Unit[] = []

    #follow(run: Run): void {
        this.#engine = run
        this.#registerObservers()
    }

    #registerObservers(): void {
        const run = this.#engine
        const { travel } = run
        this.#observers.remove()
        this.#observers = new Scope(
            this.#on(travel.visitStarted, halt => soundOfHalt(halt.type)),
            this.#on(travel.haltImpacted, halt => soundOfImpact(halt.type)),
            this.#on(travel.visitEnded, END),
            this.#on(travel.fightEntered, place => soundOfFight(place.fight?.category)),
            this.#on(travel.fightEntered, () => {
                const voice = voiceOfBattle(this.#engine.battle?.units ?? [], this.voices)
                return voice && { ...voice, delay: BATTLE_VOICE_DELAY }
            }),
            this.#on(travel.fightLeft, END),
            this.#on(travel.moved, STEP),
            // Heard as it is told, not as it plays: the battle is followed before its first sound.
            run.battleStarted.add(battle => this.#followBattle(battle)),
        )
        if(run.battle) this.#followBattle(run.battle)
    }

    #followBattle(battle: Battle): void {
        this.#unregisterBattle()
        const { signals } = battle
        this.#battleObservers = [
            // Told as the round starts, since the screen shows it after the battle has played it out.
            battle.roundStarted.add(() => {
                const first = battle.initiative.find(unit => unit.alive)
                if(first) this.#firstsOfRounds.push(first)
            }),
            this.#on(battle.roundStarted, ROUND),
            this.#on(battle.roundStarted, () => {
                const first = this.#firstsOfRounds.shift()
                return first ? quieter(voiceOf(first.sprite), ROUND_VOICE_VOLUME) : null
            }),
            this.#on(battle.onGetGold, GOLD),
            this.#on(signals.drawn, DRAW),
            this.#on(signals.cardActivated, PLAY),
            this.#on(signals.cardActivated, ({ unit }) => (
                this.voices.chance(VOICE_CHANCE) ? quieter(voiceOf(unit.sprite), ACTION_VOICE_VOLUME) : null
            )),
            this.#on(signals.cardInvalid, REFUSED),
            this.#on(signals.chainOverflowed, REFUSED),
            this.#on(battle.observers.of(WALKED), BOARD_STEP),
            this.#on(battle.observers.of(SHOVED), BOARD_STEP),
            this.#on(battle.observers.of(TURNED), ({ from, to }) => {
                return from.position.equals(to.position) ? TURN : BOARD_STEP
            }),
            ...[BLINKED, LEAPED, TELEPORTED, SWAPPED].map(key => this.#on(battle.observers.of(key), BLINK)),
            this.#on(battle.observers.of(BUMPED), BUMP),
            this.#on(signals.damaged, ({ amount }) => hurtCue(amount)),
            this.#on(signals.heartWounded, HEART_LOST),
            this.#on(signals.healed, HEAL),
            this.#on(signals.statusAdded, ({ type }) => soundOfStatus(type)),
            this.#on(signals.notifyStatus, ({ target }) => soundOfStatus(target.type)),
            this.#on(signals.statusRemoved, STATUS_END),
            this.#on(signals.spawned, APPEAR),
            this.#on(signals.spawned, ({ unit }) => (
                unit.tangible ? quieter(voiceOf(unit.sprite), SPAWN_VOICE_VOLUME) : null
            )),
            this.#on(signals.died, DEATH),
            this.#on(signals.died, ({ unit }) => voiceOf(unit.sprite)),
        ]
    }

    /** Play a sound when the animation of an event starts: the given one, or one chosen from the event. */
    #on<T>(observable: Observable<T>, cue: Cue|((event: T) => Cue|null)): Observer {
        return this.forwarded.on(observable, (event, phase) => {
            if(phase !== "start") return
            const chosen = typeof cue === "function" ? cue(event) : cue
            if(chosen) this.#play(chosen)
        })
    }

    #play({ path, volume, delay }: Cue): void {
        this.player.play(EFFECTS_CHANNEL, path, { volume, delay })
    }

    #unregisterObservers(): void {
        this.#unregisterBattle()
        this.#observers.remove()
        this.#observers = new Scope()
    }

    #unregisterBattle(): void {
        for(const observer of this.#battleObservers) observer.remove()
        this.#battleObservers = []
        this.#firstsOfRounds = []
    }
}
