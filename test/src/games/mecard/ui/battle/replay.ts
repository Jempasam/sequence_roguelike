import { AnimationChain } from "@game/core-src/engine/ui/AnimationChain"
import { FrameClock } from "@game/core-src/engine/ui/FrameClock"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import { BattleAnimations } from "@game/core-src/games/mecard/ui/battle/BattleAnimations"
import type { BattleScene } from "@game/core-src/games/mecard/ui/battle/BattleScene"
import { PlayControl, POLL_TIME, SPEED_TIME } from "@game/core/mecard/play-control"

/** Let what plays go on, each thing started once the one before is done, however many wait. */
export async function settled(): Promise<void> {
    await new Promise<void>(resolve => setTimeout(resolve, 0))
}

/** How long the replay stops on what it shows, when it plays at its pace: a stop of the animations. */
export const BEAT = SPEED_TIME.play

/** What a battle told, played on a scene as a screen does, frame after frame. */
export class Replay {


    public readonly chain = new AnimationChain(error => {
        throw error
    })

    public readonly clock = new FrameClock()

    public readonly animations: BattleAnimations

    /** What the stops of the replay wait on. */
    public readonly control: PlayControl

    constructor(
        public readonly scene: BattleScene,
        public readonly battle: Battle,
    ){
        this.control = new PlayControl(this.clock)
        this.animations = new BattleAnimations(scene, this.chain, this.clock, this.control)
        scene.resync(battle)
        this.animations.register(battle)
    }


    /** Has it played everything it heard? */
    public get drained(): boolean {
        return !this.chain.busy
    }

    /**
     * Play as far as the time of a frame goes, by steps of the time a stop reads its speed again after: it
     * would not see the time pass in one frame.
     */
    public async frame(dt: number): Promise<void> {
        await settled()
        // Counted in whole steps, so the sum of the steps is not shorter by a rounding.
        const whole = Math.floor(dt / POLL_TIME + 1e-9)
        for(let step = 0; step < whole; step++){
            this.clock.advance(POLL_TIME)
            await settled()
        }
        const rest = dt - whole * POLL_TIME
        if(rest > 1e-9){
            this.clock.advance(rest)
            await settled()
        }
    }

    /** Play everything heard to its end, however long it takes. */
    public async played(): Promise<void> {
        while(this.chain.busy){
            this.clock.finish()
            await settled()
        }
    }

    /** Drop everything heard, and take the battle as it is, as a screen skipping does. */
    public async finish(): Promise<void> {
        this.chain.cancel()
        this.control.cancel()
        this.clock.finish()
        await settled()
        this.scene.resync(this.battle)
    }
}
