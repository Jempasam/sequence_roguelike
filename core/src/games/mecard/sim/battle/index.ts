/**
 * @packageDocumentation
 * The rules of a fight: a {@link Battle} on an {@link Arena}, between units of any {@link Team}, each
 * playing a {@link CardChain} of typed {@link Card} trees as a queue of steps. What the cards, statuses and
 * items actually are lives in the catalog: this module only knows their shape.
 */

export * from "./Action"
export * from "./Area"
export * as Areas from "./area/Areas"
export * from "./Arena"
export * from "./Battle"
export * from "./BattleState"
export * from "./Deck"
export * from "./DamageType"
export * from "./Decks"
export * from "./events"
export * from "./hitbox/Box"
export * from "./hitbox/Disk"
export * from "./hitbox/Hitbox"
export * from "./hitbox/loadedHitbox"
export * from "./pathfinding"
export * from "./preview/Preview"
export * from "./preview/PreviewContext"
export * from "./preview/Previewable"
export * as Previews from "./preview/Previews"
export * from "./previewColors"
export * from "./rules"
export * from "./Team"
export * from "./Unit"
export * from "./words"
export * from "./signals"
export * from "./effects"
