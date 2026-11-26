import { visual } from "../../../base/Visual"
import type { VisualColor } from "../../../base/Visual"

/** The hue of a demonic blow. */
const DEMON_COLORATION: VisualColor = [1, 0.15, 0.15]

/** The hue of a blow of an assassin, struck from the dark. */
const SHADOW_COLORATION: VisualColor = [0.6, 0.25, 1]

/** How a shot flying out looks: a small picture crossing its area, one for each shot of a volley. */
export const SHOT_LOOK = visual("shot")

/** How the shot of a bow looks: an arrow crossing its area. */
export const ARROW_LOOK = visual("arrow")

/** How the shot of a firearm looks: a bullet crossing its area. */
export const BULLET_LOOK = visual("bullet")

/** How a spell looks, before the hue of its element: an orb crossing its area. */
export const SPELL_LOOK = visual("spell")

/** How a stab, a charge or a thrown blade looks: a long picture sliding through its area. */
export const THRUST_LOOK = visual("thrust")

/** How a blow in an arc looks: a blade turning through its area. */
export const SLASH_LOOK = visual("slash")

/** How a demonic blow of a blade looks. */
export const DEMON_SWEEP_LOOK = SLASH_LOOK.with({ coloration: DEMON_COLORATION })

/** How a demonic thrust or dash looks. */
export const DEMON_THRUST_LOOK = THRUST_LOOK.with({ coloration: DEMON_COLORATION })

/** How the stab of an assassin looks. */
export const SHADOW_THRUST_LOOK = THRUST_LOOK.with({ coloration: SHADOW_COLORATION })

/** How a blow landing on a unit looks: a burst on it. */
export const SMASH_LOOK = visual("smash")

/** How a blow of claws looks: strokes across its area. */
export const CLAWS_LOOK = visual("claws")

/** How a blow falling from above looks: a hammer crushing its area. */
export const HAMMER_LOOK = visual("hammer")

/** How a blow spreading around looks: a ring going out. */
export const SHOCKWAVE_LOOK = visual("shockwave")

/** How a beam looks: a picture stretched across its area. */
export const BEAM_LOOK = visual("beam")

/** How a stroke of lightning looks: a kinked line across its area. */
export const LIGHTNING_LOOK = visual("lightning")
