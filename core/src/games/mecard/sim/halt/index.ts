/**
 * @packageDocumentation
 * The halts of the journey, the places that hold no fight but a visit. A {@link HaltType} is a sort of halt,
 * and makes the stateful {@link Halt} a place holds. A halt asks the players through a {@link HaltContext},
 * which the interface implements, and tells what it looks like as a {@link SceneLook}. The halts themselves
 * are in `subs`, collected in `catalog`.
 */

export * from "./Halt"
export * from "./HaltContext"
export * from "./HaltType"
export * from "./PnjHats"
export * from "./SceneLook"
export * from "./transitions"
