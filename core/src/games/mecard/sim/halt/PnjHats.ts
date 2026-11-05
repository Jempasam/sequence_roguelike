import type { ImagePath } from "../../../../engine/assets"

/**
 * A hat a character may wear: its name on the buttons, its picture, and how large it is worn. Its colors
 * are saturated where a color given to it recolors it, white and grey where none does.
 */
export interface PnjHatLook {
    readonly label: string
    readonly path: ImagePath
    readonly size: number
}

/** The hats of the characters, by their name: one for the character of each halt. */
export const PNJ_HATS = {
    hospital: { label: "Coiffe", path: "mecard/pnj/hats/hospital.png", size: 1.15 },
    shop: { label: "Toque de fourrure", path: "mecard/pnj/hats/shop.png", size: 1.1 },
    removal: { label: "Capuche", path: "mecard/pnj/hats/removal.png", size: 1.25 },
    altar: { label: "Mitre", path: "mecard/pnj/hats/altar.png", size: 0.8 },
    forge: { label: "Calotte", path: "mecard/pnj/hats/forge.png", size: 1.1 },
    butcher: { label: "Toque", path: "mecard/pnj/hats/butcher.png", size: 1.05 },
    enchanter: { label: "Cône étoilé", path: "mecard/pnj/hats/enchanter.png", size: 1.1 },
    alchemist: { label: "Turban", path: "mecard/pnj/hats/alchemist.png", size: 1.15 },
    merchant: { label: "Toque à plume", path: "mecard/pnj/hats/merchant.png", size: 1.4 },
    witch: { label: "Sorcière", path: "mecard/pnj/hats/witch.png", size: 1.6 },
    inventor: { label: "Lunettes", path: "mecard/pnj/hats/inventor.png", size: 1.1 },
    tavern: { label: "Béret", path: "mecard/pnj/hats/tavern.png", size: 1.3 },
    trainer: { label: "Chapeau de chasse", path: "mecard/pnj/hats/trainer.png", size: 1.4 },
    demon: { label: "Couronne cornue", path: "mecard/pnj/hats/demon.png", size: 1.3 },
    antiquarian: { label: "Toque de velours", path: "mecard/pnj/hats/antiquarian.png", size: 1.1 },
    magician: { label: "Haut-de-forme", path: "mecard/pnj/hats/magician.png", size: 1.3 },
    madDoctor: { label: "Chapeau de médecin", path: "mecard/pnj/hats/mad-doctor.png", size: 1.6 },
    // Waiting for its own art: the hat of the forge.
    weaver: { label: "Calotte de tisserand", path: "mecard/pnj/hats/forge.png", size: 1.1 },
    strategist: { label: "Bicorne", path: "mecard/pnj/hats/strategist.png", size: 1.3 },
    necromancer: { label: "Cagoule au crâne", path: "mecard/pnj/hats/necromancer.png", size: 1.25 },
} as const satisfies Readonly<Record<string, PnjHatLook>>

/** The name of a hat of the characters. */
export type PnjHatName = keyof typeof PNJ_HATS
