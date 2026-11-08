import type { Visual } from "../base/Visual"
import { visual } from "../base/Visual"

/**
 * A hat a character may wear: its name on the buttons, its picture, and how large it is worn. Its colors
 * are saturated where a color given to it recolors it, white and grey where none does.
 */
export interface PnjHatLook {
    readonly label: string
    readonly path: Visual
    readonly size: number

    /**
     * The point of its picture set on its place, as shares of its width and height: the held part of an
     * object, which sits on the line painted for it. The middle of the picture when none (a mask), the
     * middle of its bottom edge for a hat.
     */
    readonly anchor?: readonly [x: number, y: number]
}

/** The hats a character may wear, by their name: each named for what it is. */
export const PNJ_HATS = {
    coif: { label: "Coiffe", path: visual("pnj/hats/coif"), size: 1.15 },
    furToque: { label: "Toque de fourrure", path: visual("pnj/hats/fur-toque"), size: 1.1 },
    hood: { label: "Capuche", path: visual("pnj/hats/hood"), size: 1.25 },
    mitre: { label: "Mitre", path: visual("pnj/hats/mitre"), size: 0.8 },
    skullcap: { label: "Calotte", path: visual("pnj/hats/skullcap"), size: 1.1 },
    chefToque: { label: "Toque", path: visual("pnj/hats/chef-toque"), size: 1.05 },
    starCone: { label: "Cône étoilé", path: visual("pnj/hats/star-cone"), size: 1.1 },
    turban: { label: "Turban", path: visual("pnj/hats/turban"), size: 1.15 },
    featherToque: { label: "Toque à plume", path: visual("pnj/hats/feather-toque"), size: 1.4 },
    witchHat: { label: "Sorcière", path: visual("pnj/hats/witch-hat"), size: 1.6 },
    goggles: { label: "Lunettes", path: visual("pnj/hats/goggles"), size: 1.1 },
    beret: { label: "Béret", path: visual("pnj/hats/beret"), size: 1.3 },
    huntingHat: { label: "Chapeau de chasse", path: visual("pnj/hats/hunting-hat"), size: 1.4 },
    hornedCrown: { label: "Couronne cornue", path: visual("pnj/hats/horned-crown"), size: 1.3 },
    velvetToque: { label: "Toque de velours", path: visual("pnj/hats/velvet-toque"), size: 1.1 },
    topHat: { label: "Haut-de-forme", path: visual("pnj/hats/top-hat"), size: 1.3 },
    doctorHat: { label: "Chapeau de médecin", path: visual("pnj/hats/doctor-hat"), size: 1.6 },
    bicorne: { label: "Bicorne", path: visual("pnj/hats/bicorne"), size: 1.3 },
    skullHood: { label: "Cagoule au crâne", path: visual("pnj/hats/skull-hood"), size: 1.25 },
} as const satisfies Readonly<Record<string, PnjHatLook>>

/** The name of a hat of the characters. */
export type PnjHatName = keyof typeof PNJ_HATS

/**
 * The masks a character may wear on its face, shaped as the hats. Each picture is 12 by 17 cells, one empty
 * cell around its art, the whole face (75 by 110 of the painting, the mask place) at size 0.83: its middle
 * is the middle of the face, so what is drawn high or low in the picture sits so on the face.
 */
export const PNJ_MASKS = {
    domino: { label: "Domino", path: visual("pnj/masks/domino"), size: 0.83 },
    wolf: { label: "Loup", path: visual("pnj/masks/wolf"), size: 0.83 },
    venetian: { label: "Vénitien", path: visual("pnj/masks/venetian"), size: 0.83 },
    skull: { label: "Crâne", path: visual("pnj/masks/skull"), size: 0.83 },
    skeleton: { label: "Squelette", path: visual("pnj/masks/skeleton"), size: 0.83 },
    beard: { label: "Barbe", path: visual("pnj/masks/beard"), size: 0.83 },
    hookedNose: { label: "Nez crochu", path: visual("pnj/masks/hooked-nose"), size: 0.83 },
    sunglasses: { label: "Lunettes de soleil", path: visual("pnj/masks/sunglasses"), size: 0.83 },
    nerd: { label: "Lunettes d'intello", path: visual("pnj/masks/nerd"), size: 0.83 },
} as const satisfies Readonly<Record<string, PnjHatLook>>

/** The name of a mask of the characters. */
export type PnjMaskName = keyof typeof PNJ_MASKS

/**
 * The objects a character may carry in its hands, shaped as the hats. Each picture is 38 by 21 cells, drawn
 * lying along the line of its place, its tip to the right, its held part on the middle row, at the column
 * the anchor says. At size 0.85 the picture is as long as the line (244 of the painting).
 */
export const PNJ_ITEMS = {
    sword: { label: "Épée", path: visual("pnj/items/sword"), size: 0.85, anchor: [0.171, 0.5] },
    scepter: { label: "Sceptre d'or", path: visual("pnj/items/scepter"), size: 0.85, anchor: [0.329, 0.5] },
    pitchfork: { label: "Fourche", path: visual("pnj/items/pitchfork"), size: 0.85, anchor: [0.303, 0.5] },
    bow: { label: "Arc", path: visual("pnj/items/bow"), size: 0.85, anchor: [0.5, 0.5] },
    wrench: { label: "Clé à molette", path: visual("pnj/items/wrench"), size: 0.85, anchor: [0.276, 0.5] },
    hammer: { label: "Marteau", path: visual("pnj/items/hammer"), size: 0.85, anchor: [0.224, 0.5] },
    cleaver: { label: "Couteau de boucher", path: visual("pnj/items/cleaver"), size: 0.85, anchor: [0.145, 0.5] },
    demonFork: { label: "Fourche de démon", path: visual("pnj/items/demon-fork"), size: 0.85, anchor: [0.25, 0.5] },
    magicianWand: { label: "Baguette de magicien", path: visual("pnj/items/magician-wand"), size: 0.85, anchor: [0.355, 0.5] },
    witchWand: { label: "Baguette de sorcière", path: visual("pnj/items/witch-wand"), size: 0.85, anchor: [0.276, 0.5] },
    potion: { label: "Potion", path: visual("pnj/items/potion"), size: 0.85, anchor: [0.539, 0.5] },
    whip: { label: "Fouet", path: visual("pnj/items/whip"), size: 0.85, anchor: [0.118, 0.5] },
} as const satisfies Readonly<Record<string, PnjHatLook>>

/** The name of an object carried by the characters. */
export type PnjItemName = keyof typeof PNJ_ITEMS
