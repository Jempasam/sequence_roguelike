import type { SoundPlayer } from "../../../../engine/audio"
import type { Observable, Observer } from "../../sim/base/Observable"
import { Scope } from "../../../../lifetime"
import type { Battle } from "../../sim/battle/Battle"
import type { Run } from "../../sim/run/Run"
import type { Forwarded } from "../forward/Forwarded"
import type { Cue } from "./Cue"
import { FIGHT_CUES, soundOfFight } from "./fightSounds"
import { HALT_CUES, soundOfHalt, soundOfImpact } from "./haltSounds"
import { soundOfStatus, STATUS_CUES } from "./statusSounds"

/** The channel the sounds of the journey and of the battles are played on. */
export const EFFECTS_CHANNEL = "effects"

/** The end of a visit or of a fight: a deep note. */
const END: Cue = { path: "mecard/sounds/guitare_grave.ogg", volume: 1 }

/** A step on the map. */
const STEP: Cue = { path: "mecard/sounds/tchi.wav", volume: 1.5 }

/** A card is drawn. */
const DRAW: Cue = { path: "mecard/sounds/card.wav", volume: 1.5 }

/** A card is played: a slap. */
const PLAY: Cue = { path: "mecard/sounds/card_play.wav", volume: 1 }

/** A unit steps on the board. */
const BOARD_STEP: Cue = { path: "mecard/sounds/step.wav", volume: 1 }

/** A unit turns on the spot, its place unchanged. */
const TURN: Cue = { path: "mecard/sounds/turn.wav", volume: 1 }

/** A unit is hurt. */
const HURT: Cue = { path: "mecard/sounds/hit.wav", volume: 1 }

/** A unit is hurt badly. */
const HURT_HEAVY: Cue = { path: "mecard/sounds/hit_heavy.wav", volume: 1 }

/** A unit loses hearts. */
const HEART_LOST: Cue = { path: "mecard/sounds/heart_lost.wav", volume: 0.8 }

/** A unit is healed. */
const HEAL: Cue = { path: "mecard/sounds/heal.wav", volume: 1 }

/** A unit loses a status. */
const STATUS_END: Cue = { path: "mecard/sounds/status_end.wav", volume: 1 }

/** A unit appears. */
const APPEAR: Cue = { path: "mecard/sounds/spawn.wav", volume: 1 }

/** A unit dies. */
const DEATH: Cue = { path: "mecard/sounds/death.wav", volume: 1 }

/** Two units run into each other. */
const BUMP: Cue = { path: "mecard/sounds/bump.wav", volume: 1 }

/** The chain of a unit cannot go on: too long, or a card cannot be built. */
const REFUSED: Cue = { path: "mecard/sounds/chain_overflow.wav", volume: 1 }

/** A round starts: a light gong. */
const ROUND: Cue = { path: "mecard/sounds/round_start.wav", volume: 1 }

/** Gold is gained: a coin. */
const GOLD: Cue = { path: "mecard/sounds/gold.wav", volume: 1 }

/** The damage, in hearts, from which a blow is heavy. */
const HEAVY_DAMAGE = 3

/** Every sound the link plays, loaded as it starts. */
const CUES: readonly Cue[] = [
    END, STEP, DRAW, PLAY, BOARD_STEP, TURN, HURT, HURT_HEAVY, HEART_LOST, HEAL,
    STATUS_END, APPEAR, DEATH, BUMP, REFUSED, ROUND, GOLD, ...STATUS_CUES, ...HALT_CUES, ...FIGHT_CUES,
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
            this.#on(battle.roundStarted, ROUND),
            this.#on(battle.onGetGold, GOLD),
            this.#on(signals.drawn, DRAW),
            this.#on(signals.cardActivated, PLAY),
            this.#on(signals.cardInvalid, REFUSED),
            this.#on(signals.chainOverflowed, REFUSED),
            this.#on(signals.moved, ({ from, to }) => from.position.equals(to.position) ? TURN : BOARD_STEP),
            this.#on(signals.bumped, BUMP),
            this.#on(signals.damaged, ({ amount }) => amount >= HEAVY_DAMAGE ? HURT_HEAVY : HURT),
            this.#on(signals.heartWounded, HEART_LOST),
            this.#on(signals.healed, HEAL),
            this.#on(signals.statusAdded, ({ type }) => soundOfStatus(type)),
            this.#on(signals.notifyStatus, ({ target }) => soundOfStatus(target.type)),
            this.#on(signals.statusRemoved, STATUS_END),
            this.#on(signals.spawned, APPEAR),
            this.#on(signals.died, DEATH),
        ]
    }

    /** Play a sound when the animation of an event starts: the given one, or one chosen from the event. */
    #on<T>(observable: Observable<T>, cue: Cue|((event: T) => Cue)): Observer {
        return this.forwarded.on(observable, (event, phase) => {
            if(phase === "start") this.#play(typeof cue === "function" ? cue(event) : cue)
        })
    }

    #play({ path, volume }: Cue): void {
        this.player.play(EFFECTS_CHANNEL, path, { volume })
    }

    #unregisterObservers(): void {
        this.#unregisterBattle()
        this.#observers.remove()
        this.#observers = new Scope()
    }

    #unregisterBattle(): void {
        for(const observer of this.#battleObservers) observer.remove()
        this.#battleObservers = []
    }
}
