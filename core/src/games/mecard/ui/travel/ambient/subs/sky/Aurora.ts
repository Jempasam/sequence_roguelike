import { together } from "../../../../../../../engine/animation"
import { follow } from "../../../../../../../engine/particles"
import { visual } from "../../../../../sim/base/Visual"
import type { Scene } from "../../scene/Scene"
import { sceneEffect } from "../../scene/sceneEffect"
import { AURORA_FLOORS } from "../../themes"

/** A column of light, brighter toward its foot. */
const RAY = visual("ambient/ray")

/** How long it lasts, in seconds. */
const DURATION = 8

/** The most a column is wide, in pixels, and the most of the height of the space it covers. */
const WIDTH = 13
const HEIGHT_SHARE = 0.4

/** The most columns a veil has, so two veils leave room for the other particles. */
const MAX_COLUMNS = 90

/** A veil of columns side by side: where it hangs, how wide apart, and its colors. */
interface Veil {
    /** The share of the height of the space its middle hangs at. */
    readonly y: number

    /** How far apart two columns are, in widths of a column. */
    readonly spacing: number

    readonly colors: readonly [number, number]
    readonly opacity: number
}

const VEILS: readonly Veil[] = [
    { y: 0.14, spacing: 1.2, colors: [0x9a5aff, 0x5a7aff], opacity: 0.35 },
    { y: 0.22, spacing: 0.7, colors: [0x4affa0, 0x4ae0d0], opacity: 0.45 },
]

/** Veils of light that ripple across the top of the space. */
const SCENE: Scene = {
    playable: () => true,
    create(context){
        const sprite = context.sprite(RAY)
        if(!sprite) return null
        const { additive, random } = context
        const { width, height } = context.size()
        const size = Math.min(WIDTH, height * HEIGHT_SHARE * sprite.width / sprite.height)
        const columns = VEILS.flatMap(veil => {
            const count = Math.min(MAX_COLUMNS, Math.ceil(width / (size * veil.spacing)) + 1)
            const gap = width / (count - 1)
            const phase = random() * Math.PI * 2
            return Array.from({ length: count }, (_, index) => {
                const x = index * gap
                const turn = x * 0.025 + phase
                return follow({
                    system: additive, sprite, size, color: veil.colors[random() < 0.7 ? 0 : 1],
                    opacity: veil.opacity * (0.4 + random() * 0.6), duration: DURATION,
                    path: (_progress, age) => ({
                        x: x + Math.sin(age * 0.8 + turn * 2) * size * 0.4,
                        y: height * veil.y + Math.sin(age * 1.3 + turn) * height * 0.05,
                    }),
                })
            })
        })
        return together(columns)
    },
}

/** Northern lights ripple at the top of the sky. */
export const AURORA = sceneEffect({
    id: "aurora", category: "weather", floors: AURORA_FLOORS, outdoors: true, weight: 1, spacing: 40,
    scene: SCENE,
})
