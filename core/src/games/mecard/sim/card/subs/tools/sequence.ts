import type { Action, Pose } from "../../../battle/Action"
import type { Preview } from "../../../battle/preview/Preview"
/**
 * Actions played one after the other, as one action: the step of a card that plays what it takes more than
 * once, or with something around it. It stops when its unit dies, and shows each of them from where the one
 * before leaves the unit.
 */
export function inOrder(actions: readonly Action[]): Action {
    return {
        use: ctx => {
            for(const action of actions){
                if(!ctx.unit.alive) return
                action.use(ctx)
            }
        },
        preview: ctx => {
            let pose: Pose = ctx.pose
            let beforeStep: Preview["beforeStep"]
            const indicators: Preview["indicators"][number][] = []
            for(const action of actions){
                const shown = action.preview({ ...ctx, pose })
                indicators.push(...shown.indicators)
                pose = shown.pose
                beforeStep = shown.beforeStep ?? beforeStep
            }
            return { indicators, pose, beforeStep }
        },
    }
}

/** An action played a number of times, as one action. */
export function repeated(action: Action, count: number): Action {
    return inOrder(Array.from({ length: count }, () => action))
}
