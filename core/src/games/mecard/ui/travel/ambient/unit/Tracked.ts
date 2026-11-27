import type { AmbientUnit } from "../AmbientContext"
import { distanceBetween } from "./selection"

/** The longest way in a frame, in pixels, that is not a move. */
const STILL = 0.2

/** A unit followed while an effect plays: how it is shown, frame after frame. */
export class Tracked {

    /** How far it went since the frame before, in pixels. */
    public moved = 0

    /** The seconds it has not moved for, since it is followed. */
    public stillFor = 0

    /** Is it not shown anymore: dead, or out of sight? */
    public gone = false

    constructor(
        /** How it is shown, the last time it was. */
        public shown: AmbientUnit,
    ){}

    /** Did it move since the frame before? */
    public get moving(): boolean {
        return this.moved > STILL
    }

    /**
     * Read how it is shown now.
     *
     * @param units - The units of the space, as shown at this frame.
     */
    public update(dt: number, units: readonly AmbientUnit[]): void {
        const found = units.find(each => each.unit === this.shown.unit)
        this.gone = !found
        if(!found){
            this.moved = 0
            return
        }
        this.moved = distanceBetween(this.shown.position, found.position)
        this.shown = found
        this.stillFor = this.moving ? 0 : this.stillFor + dt
    }
}
