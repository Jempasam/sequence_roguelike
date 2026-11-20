/**
 * What went wrong, as a value: nothing in the network or the sync of a game throws, and no promise rejects.
 * What reads a text or reaches a server gives a {@link Fault} where it could not, and what cannot go on tells
 * of one.
 *
 * @remarks
 * Each case is a subclass carrying its own data, never a `kind` to switch on. How serious it is says
 * through the channel it comes by (`faulted` when it was dealt with, `ended` when what hears it stopped), not
 * through a field. Whoever shows it decides from the subclass: the fault says what happened, not how to
 * word it.
 */
export abstract class Fault {


    /** The peer that caused it, none when it is this client, or the network. */
    public abstract readonly who: string|null

    /** What happened, as a sentence for a log. */
    public abstract describe(): string
}
