/**
 * @packageDocumentation
 * What a unit lives by: its life bar, a list of {@link Heart}s, one life each, of a {@link HeartKind}
 * whose {@link HeartRule} rules say how it takes damage, heals and acts, one set of rules for each kind a bar
 * holds. The kinds themselves live in the module `subs`, one file for each, which this module does not know.
 */

export * from "./Heart"
export * from "./HeartDamage"
export * from "./HeartKind"
export * from "./HeartRule"
export * from "./Hearts"
