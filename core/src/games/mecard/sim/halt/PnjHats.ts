import type { ImagePath } from "../../../../engine/assets"

/**
 * A hat a character may wear: its name on the buttons, its picture, and how large it is worn. Its colors
 * are saturated where a color given to it recolors it, white and grey where none does.
 */
export interface PnjHatLook {
    readonly label: string
    readonly path: ImagePath
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
    coif: { label: "Coiffe", path: "mecard/pnj/hats/coif.png", size: 1.15 },
    furToque: { label: "Toque de fourrure", path: "mecard/pnj/hats/fur-toque.png", size: 1.1 },
    hood: { label: "Capuche", path: "mecard/pnj/hats/hood.png", size: 1.25 },
    mitre: { label: "Mitre", path: "mecard/pnj/hats/mitre.png", size: 0.8 },
    skullcap: { label: "Calotte", path: "mecard/pnj/hats/skullcap.png", size: 1.1 },
    chefToque: { label: "Toque", path: "mecard/pnj/hats/chef-toque.png", size: 1.05 },
    starCone: { label: "Cône étoilé", path: "mecard/pnj/hats/star-cone.png", size: 1.1 },
    turban: { label: "Turban", path: "mecard/pnj/hats/turban.png", size: 1.15 },
    featherToque: { label: "Toque à plume", path: "mecard/pnj/hats/feather-toque.png", size: 1.4 },
    witchHat: { label: "Sorcière", path: "mecard/pnj/hats/witch-hat.png", size: 1.6 },
    goggles: { label: "Lunettes", path: "mecard/pnj/hats/goggles.png", size: 1.1 },
    beret: { label: "Béret", path: "mecard/pnj/hats/beret.png", size: 1.3 },
    huntingHat: { label: "Chapeau de chasse", path: "mecard/pnj/hats/hunting-hat.png", size: 1.4 },
    hornedCrown: { label: "Couronne cornue", path: "mecard/pnj/hats/horned-crown.png", size: 1.3 },
    velvetToque: { label: "Toque de velours", path: "mecard/pnj/hats/velvet-toque.png", size: 1.1 },
    topHat: { label: "Haut-de-forme", path: "mecard/pnj/hats/top-hat.png", size: 1.3 },
    doctorHat: { label: "Chapeau de médecin", path: "mecard/pnj/hats/doctor-hat.png", size: 1.6 },
    bicorne: { label: "Bicorne", path: "mecard/pnj/hats/bicorne.png", size: 1.3 },
    skullHood: { label: "Cagoule au crâne", path: "mecard/pnj/hats/skull-hood.png", size: 1.25 },
} as const satisfies Readonly<Record<string, PnjHatLook>>

/** The name of a hat of the characters. */
export type PnjHatName = keyof typeof PNJ_HATS

/**
 * The masks a character may wear on its face, shaped as the hats. Each picture is 12 by 17 cells, one empty
 * cell around its art, the whole face (75 by 110 of the painting, the mask place) at size 0.83: its middle
 * is the middle of the face, so what is drawn high or low in the picture sits so on the face.
 */
export const PNJ_MASKS = {
    domino: { label: "Domino", path: "mecard/pnj/masks/domino.png", size: 0.83 },
    wolf: { label: "Loup", path: "mecard/pnj/masks/wolf.png", size: 0.83 },
    venetian: { label: "Vénitien", path: "mecard/pnj/masks/venetian.png", size: 0.83 },
    skull: { label: "Crâne", path: "mecard/pnj/masks/skull.png", size: 0.83 },
    skeleton: { label: "Squelette", path: "mecard/pnj/masks/skeleton.png", size: 0.83 },
    beard: { label: "Barbe", path: "mecard/pnj/masks/beard.png", size: 0.83 },
    hookedNose: { label: "Nez crochu", path: "mecard/pnj/masks/hooked-nose.png", size: 0.83 },
    sunglasses: { label: "Lunettes de soleil", path: "mecard/pnj/masks/sunglasses.png", size: 0.83 },
    nerd: { label: "Lunettes d'intello", path: "mecard/pnj/masks/nerd.png", size: 0.83 },
} as const satisfies Readonly<Record<string, PnjHatLook>>

/** The name of a mask of the characters. */
export type PnjMaskName = keyof typeof PNJ_MASKS

/**
 * The objects a character may carry in its hands, shaped as the hats. Each picture is 38 by 21 cells, drawn
 * lying along the line of its place, its tip to the right, its held part on the middle row, at the column
 * the anchor says. At size 0.85 the picture is as long as the line (244 of the painting).
 */
export const PNJ_ITEMS = {
    sword: { label: "Épée", path: "mecard/pnj/items/sword.png", size: 0.85, anchor: [0.171, 0.5] },
    scepter: { label: "Sceptre d'or", path: "mecard/pnj/items/scepter.png", size: 0.85, anchor: [0.329, 0.5] },
    pitchfork: { label: "Fourche", path: "mecard/pnj/items/pitchfork.png", size: 0.85, anchor: [0.303, 0.5] },
    bow: { label: "Arc", path: "mecard/pnj/items/bow.png", size: 0.85, anchor: [0.5, 0.5] },
    wrench: { label: "Clé à molette", path: "mecard/pnj/items/wrench.png", size: 0.85, anchor: [0.276, 0.5] },
    hammer: { label: "Marteau", path: "mecard/pnj/items/hammer.png", size: 0.85, anchor: [0.224, 0.5] },
    cleaver: { label: "Couteau de boucher", path: "mecard/pnj/items/cleaver.png", size: 0.85, anchor: [0.145, 0.5] },
    demonFork: { label: "Fourche de démon", path: "mecard/pnj/items/demon-fork.png", size: 0.85, anchor: [0.25, 0.5] },
    magicianWand: { label: "Baguette de magicien", path: "mecard/pnj/items/magician-wand.png", size: 0.85, anchor: [0.355, 0.5] },
    witchWand: { label: "Baguette de sorcière", path: "mecard/pnj/items/witch-wand.png", size: 0.85, anchor: [0.276, 0.5] },
    potion: { label: "Potion", path: "mecard/pnj/items/potion.png", size: 0.85, anchor: [0.539, 0.5] },
    whip: { label: "Fouet", path: "mecard/pnj/items/whip.png", size: 0.85, anchor: [0.118, 0.5] },
} as const satisfies Readonly<Record<string, PnjHatLook>>

/** The name of an object carried by the characters. */
export type PnjItemName = keyof typeof PNJ_ITEMS
