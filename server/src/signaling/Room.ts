import type { JsonValue, Member, PeerSignal, RoomShape } from "../protocol"
import type { Session } from "./Session"

/** What a room is created with. */
export interface RoomOptions {
    readonly code: string
    readonly shape: RoomShape
    readonly name: string

    /** The most members the room holds, its owner included. */
    readonly capacity: number
}

/**
 * The members of one room, and the session that admits newcomers: its owner. The server only passes
 * messages between them; what the members say to each other once linked never reaches it.
 *
 * @remarks
 * The shape decides who knows of whom, and nothing else: in a star, a member other than the owner is told
 * of the owner only, so the clients, which link to every member they are told of, end up in a star without
 * knowing it. Two members told of each other are linked, and only linked members may signal each other.
 *
 * The newcomer is the one that makes the offers: every member it is told of hears of it first, so an offer
 * never reaches a member that does not know its sender yet.
 */
export class Room {


    constructor(
        public readonly options: RoomOptions,
        owner: Session,

        /** Called once the room is over: emptied, or closed by the leave of a star's owner. */
        onOver: (room: Room) => void,
    ){
        this.#owner = owner
        this.#onOver = onOver
        this.#members.add(owner)
        owner.room = this
        this.#enter(owner)
    }


    public get code(): string { return this.options.code }

    /** How many members the room holds, and how many wait to enter. */
    public get size(): number { return this.#members.size + this.#knocking.size }

    /** Ask the owner to let a session in, unless the room is already full. */
    public knock(session: Session): void {
        if(this.size >= this.options.capacity){
            session.send({ type: "refused", reason: "full" })
            return
        }
        this.#knocking.add(session)
        session.room = this
        this.#owner.send({ type: "knocking", member: memberOf(session) })
    }

    /**
     * Let in or turn away a session waiting at the door, by the word of the owner.
     *
     * @throws {@link Error} When the session answering is not the owner.
     */
    public admit(by: Session, id: string, accepted: boolean): void {
        if(by !== this.#owner) throw new Error("Only the owner of a room admits newcomers.")
        // It may have left between its knock and the answer: the owner was told so, and no one is let in.
        const session = [...this.#knocking].find(knocking => knocking.id === id)
        if(!session) return
        this.#knocking.delete(session)
        if(!accepted){
            session.room = null
            session.send({ type: "refused", reason: "refused" })
            return
        }
        this.#members.add(session)
        for(const member of this.#linkedTo(session)) member.send({ type: "joined", member: memberOf(session) })
        this.#enter(session)
    }

    /** Change what a member says about itself, and tell each member linked to it. */
    public setData(session: Session, data: JsonValue): void {
        session.data = data
        if(!this.#members.has(session)) return
        for(const member of this.#linkedTo(session)) member.send({ type: "changed", member: memberOf(session) })
    }

    /**
     * Pass a signal from a member to another one it is linked to.
     *
     * @throws {@link Error} When the two are not linked members of this room.
     */
    public relay(from: Session, to: string, signal: PeerSignal): void {
        const target = [...this.#members].find(member => member.id === to)
        const areLinked = target !== undefined && this.#members.has(from) && this.#isLink(from, target)
        if(!areLinked) throw new Error(`No member ${to} linked to the sender is in the room.`)
        target.send({ type: "signal", from: from.id, signal })
    }

    /** Take a session out of the room, whether it was a member or waited to enter. */
    public leave(session: Session): void {
        session.room = null
        if(this.#knocking.delete(session)){
            this.#owner.send({ type: "left", member: session.id })
            return
        }
        if(!this.#members.has(session)) return
        const linked = this.#linkedTo(session)
        this.#members.delete(session)
        if(session === this.#owner && this.options.shape === "star") this.#close()
        else if(this.#members.size === 0) this.#close()
        else {
            for(const member of linked) member.send({ type: "left", member: session.id })
            if(session === this.#owner) this.#handOver()
        }
    }


    #owner: Session
    readonly #onOver: (room: Room) => void

    /** The members, the oldest first. */
    readonly #members = new Set<Session>()

    /** The sessions waiting for the owner's word. */
    readonly #knocking = new Set<Session>()

    /** Tell a session it is in, and who it is to link to. */
    #enter(session: Session): void {
        const { code, name, shape } = this.options
        session.send({
            type: "entered", code, name, shape,
            self: memberOf(session),
            owner: this.#owner.id,
            members: this.#linkedTo(session).map(memberOf),
        })
    }

    /** Make the oldest member the owner, and ask it about those still waiting. */
    #handOver(): void {
        const [oldest] = this.#members
        this.#owner = oldest
        for(const member of this.#members) member.send({ type: "owner", member: oldest.id })
        for(const session of this.#knocking) oldest.send({ type: "knocking", member: memberOf(session) })
    }

    #close(): void {
        for(const session of [...this.#members, ...this.#knocking]){
            session.room = null
            session.send(this.#knocking.has(session) ? { type: "refused", reason: "closed" } : { type: "closed" })
        }
        this.#members.clear()
        this.#knocking.clear()
        this.#onOver(this)
    }

    /** The other members a member is linked to. */
    #linkedTo(session: Session): Session[] {
        return [...this.#members].filter(member => member !== session && this.#isLink(session, member))
    }

    #isLink(a: Session, b: Session): boolean {
        return this.options.shape === "mesh" || a === this.#owner || b === this.#owner
    }
}

function memberOf(session: Session): Member {
    return { id: session.id, data: session.data }
}
