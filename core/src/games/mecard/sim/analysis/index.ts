/**
 * @packageDocumentation
 * What the cards of a source are for, and what a source becomes as another kind of thing: a monster, a pet, a
 * kit, a booster, a module, a beast. A card is told by hints (its description, its types, what it does played
 * alone), a source by its chains, and each target builds itself from the chains it asks for.
 */

export * from "./Anatomy"
export * from "./analysisOf"
export * from "./CardFeatures"
export * from "./CardProbe"
export * from "./combine"
export * from "./draws"
export { effectsOf } from "./effects"
export type { EffectScope, EffectsTrace, EffectUse } from "./effects"
export * from "./explain"
export * from "./Kinds"
export * from "./MergedAnalysis"
export * from "./NoResult"
export type { Segment, Window, WindowRejection } from "./OrderedChains"
export * from "./Profile"
export * from "./profileRows"
export * from "./Sizes"
export * from "./Targets"
export type {
    Candidate, CandidateRejection, ChainTrace, Fallback, IdentityTrace, PickStep, Traces,
} from "./Trace"
