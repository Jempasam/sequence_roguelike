/**
 * @packageDocumentation
 * How long things live, shared by every layer: {@link Removable} is what is taken back, {@link Observable}
 * tells listeners of what happens, and {@link Scope} takes back what was kept in it all at once.
 * It depends on nothing.
 */

export * from "./Observable"
export * from "./Removable"
export * from "./Scope"
