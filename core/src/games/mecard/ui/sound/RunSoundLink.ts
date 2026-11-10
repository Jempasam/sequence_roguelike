import type { SoundPath, SoundPlayer } from "../../../../engine/audio"
import type { Observer } from "../../sim/base/Observable"
import type { Battle } from "../../sim/battle/Battle"
import type { Run } from "../../sim/run/Run"

/** The channel the sounds of the journey and of the battles are played on. */
export const EFFECTS_CHANNEL = "effects"

/** One sound of the game: the file, and how loud it is played to sit with the others. */
interface Cue {
    /** The file of the sound. */
    readonly path: SoundPath

    /** The factor its volume is multiplied by, since the files are not recorded at the same level. */
    readonly volume: number
}

/** The beginning of a visit: a note. */
const BEGIN: Cue = { path: "mecard/sounds/guitare.ogg", volume: 1 }

/** The end of a visit or of a fight: a deep note. */
const END: Cue = { path: "mecard/sounds/guitare_grave.ogg", volume: 1 }

/** A fight begins: two blows of a sword, the loudest file, brought down. */
const FIGHT: Cue = { path: "mecard/sounds/sword.wav", volume: 0.6 }

/** A step, on the map or on the board. */
const STEP: Cue = { path: "mecard/sounds/tchi.wav", volume: 1.5 }

/** A card is drawn. */
const DRAW: Cue = { path: "mecard/sounds/card.wav", volume: 1.5 }

/** A card is played. */
const PLAY: Cue = { path: "mecard/sounds/click.wav", volume: 1 }

/** A unit is hurt: a dull clonk. */
const HURT: Cue = { path: "mecard/sounds/declick.wav", volume: 0.6 }

/** A soft sound, for a heal or a status: a pop, the quietest file but one, brought up. */
const SOFT: Cue = { path: "mecard/sounds/pop.wav", volume: 2.5 }

/** A unit appears. */
const APPEAR: Cue = { path: "mecard/sounds/frinch.wav", volume: 1.5 }

/** A unit dies. */
const DEATH: Cue = { path: "mecard/sounds/dragon.wav", volume: 1 }

/** A mark of the round or of the gold: a beep, the quietest file, brought up a lot. */
const MARK: Cue = { path: "mecard/sounds/top.wav", volume: 3 }

/** Every sound the link plays, loaded as it starts. */
const CUES: readonly Cue[] = [BEGIN, END, FIGHT, STEP, DRAW, PLAY, HURT, SOFT, APPEAR, DEATH, MARK]

/**
 * Tells the speakers what a run does: the sounds of its journey and of the battles it fights, played by a
 * {@link SoundPlayer}.
 *
 * @remarks
 * Made like a broadcaster, it reads the run and changes nothing of it: the run knows no sound. It follows
 * the battle being fought, and lets go of it when the next one comes.
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
    #observers: Observer[] = []
    #battleObservers: Observer[] = []

    #follow(run: Run): void {
        this.#engine = run
        this.#registerObservers()
    }

    #registerObservers(): void {
        const run = this.#engine
        const { travel } = run
        this.#observers = [
            travel.visitStarted.add(() => this.#play(BEGIN)),
            travel.visitEnded.add(() => this.#play(END)),
            travel.fightEntered.add(() => this.#play(FIGHT)),
            travel.fightLeft.add(() => this.#play(END)),
            travel.moved.add(() => this.#play(STEP)),
            run.battleStarted.add(battle => this.#followBattle(battle)),
        ]
        if(run.battle) this.#followBattle(run.battle)
    }

    #followBattle(_battle: Battle): void {
        this.#unregisterBattle()
        // TEMPORARY: the sounds of the battle are off, they all play at once.
        // const { signals } = battle
        // this.#battleObservers = [
        //     battle.roundStarted.add(() => this.#play(MARK)),
        //     battle.onGetGold.add(() => this.#play(MARK)),
        //     signals.drawn.add(() => this.#play(DRAW)),
        //     signals.cardActivated.add(() => this.#play(PLAY)),
        //     signals.moved.add(() => this.#play(STEP)),
        //     signals.damaged.add(() => this.#play(HURT)),
        //     signals.healed.add(() => this.#play(SOFT)),
        //     signals.statusAdded.add(() => this.#play(SOFT)),
        //     signals.spawned.add(() => this.#play(APPEAR)),
        //     signals.died.add(() => this.#play(DEATH)),
        // ]
    }

    #play({ path, volume }: Cue): void {
        this.player.play(EFFECTS_CHANNEL, path, { volume })
    }

    #unregisterObservers(): void {
        this.#unregisterBattle()
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    #unregisterBattle(): void {
        for(const observer of this.#battleObservers) observer.remove()
        this.#battleObservers = []
    }
}
