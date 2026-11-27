import { queue, together } from "../../../../../../../engine/animation"
import { follow, pick } from "../../../../../../../engine/particles"
import { Unit } from "../../../../../sim/battle/Unit"
import type { AmbientContext, AmbientUnit } from "../../AmbientContext"
import type { Scene } from "../../scene/Scene"
import { sceneEffect } from "../../scene/sceneEffect"
import { densityAt } from "../../scene/Spot"
import { bodies, playerHeroes } from "../../unit/selection"

/** How long it lasts, in seconds. */
const DURATION = 7

/** The most the picture is wide, in pixels, and the most of the width and the height of the space. */
const SIZE = 70
const WIDTH_SHARE = 0.25
const HEIGHT_SHARE = 0.35

/** How many stars surround the picture at scale 1, and the seconds between two that light up. */
const STARS = 14
const GAP = 0.18

/** The units of the party: all of them on the map, the ones of the side of the players in a battle. */
function party(context: AmbientContext): readonly AmbientUnit[] {
    const played = playerHeroes(context)
    const teams = played.map(({ unit }) => unit instanceof Unit ? unit.team : null)
    return bodies(context).filter(({ unit }) => !(unit instanceof Unit) || teams.includes(unit.team))
}

/** Stars light up around a great pale picture of one of the party, a monster ally first. */
const SCENE: Scene = {
    playable: context => party(context).length > 0,
    create(context){
        const { additive, random } = context
        const members = party(context)
        if(members.length === 0) return null
        const allies = members.filter(({ unit }) => unit.controller !== "player")
        const { unit } = pick(random, allies.length > 0 ? allies : members)
        const sprite = context.sprite(unit.sprite)
        if(!sprite) return null
        const { width, height } = context.size()
        const ratio = sprite.height / sprite.width
        const size = Math.min(SIZE, width * WIDTH_SHARE, height * HEIGHT_SHARE / ratio)
        const middle = { x: width * (0.2 + random() * 0.6), y: height * 0.28 }
        const picture = follow({
            system: additive, sprite, size, color: 0x6a9aff, opacity: 0.25, duration: DURATION,
            path: (_progress, age) => ({ x: middle.x, y: middle.y + Math.sin(age) * 2 }),
        })
        const count = Math.round(STARS * densityAt(context.scale, 2))
        const gap = Math.min(GAP, DURATION / 2 / count)
        const stars = queue(count, gap, index => {
            const angle = (index + random() * 0.6) / count * Math.PI * 2
            const reach = 0.5 + random() * 0.25
            const star = {
                x: middle.x + Math.cos(angle) * size * reach,
                y: middle.y + Math.sin(angle) * size * ratio * reach,
            }
            return follow({
                system: additive, size: random() < 0.3 ? 3 : 2, color: pick(random, [0xffffff, 0xbfe0ff]),
                duration: DURATION - index * gap, path: () => star,
            })
        })
        return together([picture, stars])
    },
}

/** The stars draw one of the party in the sky. */
export const CONSTELLATION = sceneEffect({
    id: "constellation", category: "surprise", outdoors: true, weight: 1, spacing: 40, scene: SCENE,
})
