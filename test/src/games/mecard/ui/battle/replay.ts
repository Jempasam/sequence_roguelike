import { AnimationChain, FrameClock } from "@game/core"
import type { Battle } from "@game/core/mecard"
import { BattleAnimations } from "@game/core/mecard/battle-ui"
import type { BattleScene } from "@game/core/mecard/battle-ui"

/** Let what plays go on, each thing started once the one before is done. */
export async function settled(): Promise<void> {
    for(let turn = 0; turn < 20; turn++) await Promise.resolve()
}

/** What a battle told, played on a scene as a screen does, frame after frame. */
export class Replay {


    public readonly chain = new AnimationChain(error => {
        throw error
    })

    public readonly clock = new FrameClock()

    public readonly animations: BattleAnimations

    constructor(
        public readonly scene: BattleScene,
        public readonly battle: Battle,
    ){
        this.animations = new BattleAnimations(scene, this.chain, this.clock)
        scene.resync(battle)
        this.animations.register(battle)
    }


    /** Has it played everything it heard? */
    public get drained(): boolean {
        return !this.chain.busy
    }

    /** Play as far as the time of a frame goes. */
    public async frame(dt: number): Promise<void> {
        this.clock.advance(dt)
        await settled()
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
        this.clock.finish()
        await settled()
        this.scene.resync(this.battle)
    }
}
