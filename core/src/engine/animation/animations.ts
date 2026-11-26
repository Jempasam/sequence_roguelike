import type { Animation } from "./Animation"

/** An animation made of its updates alone: nothing to do at its start nor at its end. */
function updating(update: (dt: number) => boolean): Animation {
    return { start(){}, update, end(){} }
}

/** An animation that emits what it wants each frame for a time: `step` gets the frame's time and its age. */
export function timed(duration: number, step: (dt: number, age: number) => void): Animation {
    let age = 0
    return {
        start(){
            age = 0
        },
        update(dt){
            age += dt
            step(dt, age)
            return age < duration
        },
        end(){},
    }
}

/** An animation that does something at once and is over. */
export function once(run: () => void): Animation {
    return updating(() => {
        run()
        return false
    })
}

/**
 * Animations of which an effect is made, over when all are. Each is started with it, and ended as soon as it
 * is over, or with it when it is cut short.
 */
export function together(animations: readonly Animation[]): Animation {
    let alive: Animation[] = []
    return {
        start(){
            alive = []
            for(const animation of animations){
                animation.start()
                alive.push(animation)
            }
        },
        update(dt){
            for(const animation of [...alive]){
                let going = false
                try {
                    going = animation.update(dt)
                }
                finally {
                    if(!going){
                        alive.splice(alive.indexOf(animation), 1)
                        animation.end()
                    }
                }
            }
            return alive.length > 0
        },
        end(){
            const left = alive
            alive = []
            for(const animation of left) animation.end()
        },
    }
}

/** An animation that waits, then makes another and plays it: what it emits starts when it is made. */
export function after(delay: number, make: () => Animation|null): Animation {
    let left = delay
    let made = false
    let playing: Animation|null = null
    return {
        start(){
            left = delay
            made = false
            playing = null
        },
        update(dt){
            if(left > 0){
                left -= dt
                return true
            }
            if(!made){
                made = true
                playing = make()
                playing?.start()
            }
            if(!playing) return false
            const going = playing.update(dt)
            if(!going){
                const over = playing
                playing = null
                over.end()
            }
            return going
        },
        end(){
            const over = playing
            playing = null
            over?.end()
        },
    }
}

/** Animations that start one after another, `gap` seconds apart: each is made when its turn comes. */
export function queue(count: number, gap: number, make: (index: number) => Animation|null): Animation {
    return together(Array.from({ length: count }, (_, index) => after(index * gap, () => make(index))))
}

/**
 * An animation written as a generator function: it is made at the start, moved on by one frame at each
 * update (what `yield` gives back is the time of the frame, in seconds), and closed at the end, which runs
 * its `finally`. It is over when the generator returns.
 */
export function animationFn(make: () => Generator<void, void, number>): Animation {
    let running: Generator<void, void, number>|null = null
    return {
        start(){
            running = make()
            running.next(0)
        },
        update(dt){
            return running !== null && !running.next(dt).done
        },
        end(){
            const over = running
            running = null
            over?.return()
        },
    }
}
