import type { Painter } from "../../../engine/gpu"
import type { InputFrame } from "../../../engine/input"
import { defaultLevels } from "../level/defaultLevels"
import { World } from "../level/World"
import { CosmosView } from "../render/CosmosView"
import type { Anchor } from "../space/Anchor"
import { Space } from "../space/Space"
import { panelModel } from "../ui/LevelPanelModel"
import type { PanelModel } from "../ui/LevelPanelModel"

/** How many times faster than real time the time goes, by the choices the player cycles through. */
const SPEEDS = [1, 10, 100, 1000] as const

/** The zoom of a notch of the wheel and the pan and turn speeds per second of a key held. */
const NOTCH_ZOOM = 0.8
const ZOOM_RATE = 1.6
const PAN_RATE = 0.4
const TURN_RATE = 1.2

/**
 * The universe, where the player is in it, and the points the player put in it. Arrows move the pose of the
 * current level, A and D turn the camera, W and S tilt it, the wheel or Page Up and Page Down zoom, Space
 * puts a point, Backspace takes them off, T changes the speed of time.
 */
export class CosmosGame {

    private readonly space: Space

    private readonly view = new CosmosView()

    private readonly anchors: Anchor[] = []

    private time = 0

    private speed = 0


    constructor(seed: number){
        const world = new World(seed, defaultLevels())
        this.space = new Space(world.registry.get("universe"))
    }


    /** The levels crossed and the zoom, for the panel. */
    public panel(): PanelModel {
        return panelModel(this.space)
    }

    /** The speed of time, as a factor of real time. */
    public get speedFactor(): number {
        return SPEEDS[this.speed]
    }

    /** Read the input, move the time and the pose, and draw. */
    public frame(input: InputFrame, painter: Painter, dt: number): void {
        this.time += dt * SPEEDS[this.speed]
        const space = this.space
        const held = (code: string) => input.isKeyHeld(code)
        const axis = (plus: string, minus: string) => (held(plus) ? 1 : 0) - (held(minus) ? 1 : 0)

        // INPUT //
        for(const event of input.events){
            if(event.consumed) continue
            if(event.type === "wheel") space.zoom(NOTCH_ZOOM ** Math.sign(-event.dy))
            if(event.type === "key-down" && event.code === "Space") this.anchors.push(space.anchorHere())
            if(event.type === "key-down" && event.code === "Backspace") this.anchors.length = 0
            if(event.type === "key-down" && event.code === "KeyT") this.speed = (this.speed + 1) % SPEEDS.length
        }
        const right = axis("ArrowRight", "ArrowLeft")
        const down = axis("ArrowDown", "ArrowUp")
        if(right !== 0 || down !== 0) space.move(right * PAN_RATE * dt, down * PAN_RATE * dt)
        const yaw = axis("KeyD", "KeyA")
        const pitch = axis("KeyS", "KeyW")
        if(yaw !== 0 || pitch !== 0) space.orbit(yaw * TURN_RATE * dt, pitch * TURN_RATE * dt)
        const zoom = axis("PageUp", "PageDown")
        if(zoom !== 0) space.zoom(Math.exp(-zoom * ZOOM_RATE * dt))

        // LEVELS //
        space.update(this.time)

        // DRAW //
        this.view.draw(painter, space, this.anchors, this.time)
    }
}
