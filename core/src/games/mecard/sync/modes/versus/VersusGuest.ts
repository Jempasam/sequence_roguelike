import type { SyncLink } from "../../../../../platform"
import type { Fault } from "../../../../../engine/net/Fault"
import type { Observable } from "../../../sim/base/Observable"
import type { SavedUnit } from "../../../sim/save/battleSave"

import type { Attendee } from "../../Gathering"
import type { SyncSource } from "../../SyncChannel"
import type { DuelView } from "../DuelView"
import { NO_TIME, RemoteHub } from "../players/RemoteHub"
import { VersusPlayer } from "../players/VersusPlayer"

/**
 * A player of a {@link Versus} that reaches the hub by a connection: a {@link VersusPlayer} on a
 * {@link RemoteHub}, kept together under the name it always had, with what each of them gives.
 */
export class VersusGuest {


    /** The way to the hub, on the connection. */
    public readonly hub: RemoteHub

    /** What plays the duel. */
    public readonly player: VersusPlayer

    /** Takes the player in the gathering. */
    public readonly attendee: Attendee

    /** The duel followed, which tells when the player fights or watches it. */
    public readonly view: DuelView

    /** Told of what was dealt with: a message left out. */
    public readonly faulted: Observable<Fault>

    /** Told once, when the player is turned away. */
    public readonly ended: Observable<Fault>

    constructor(
        link: SyncLink,

        /** Where the battles of the duels are heard. */
        source: SyncSource,

        /** The units the player brings, asked when the hub wants them. */
        units: () => readonly SavedUnit[],
    ){
        // A duel with no journey has no time limit to show.
        this.hub = new RemoteHub(link, source, NO_TIME)
        this.player = new VersusPlayer(this.hub, units)
        this.attendee = this.hub.attendee
        this.view = this.hub.view
        this.faulted = this.player.faulted
        this.ended = this.player.ended
    }


    /** Give the hub what was committed for the units of the player: it is ready. */
    public ready(): void {
        this.view.ready()
    }

    /** Stop. */
    public dispose(): void {
        this.player.dispose()
    }
}
