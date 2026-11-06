import type { Painter, Sprite } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { TextLayout } from "../../../../engine/text"
import type { BitmapFont } from "../../../../engine/text"
import { outline, touches } from "../../sim/battle/Area"
import { BURN } from "../../sim/status/subs/Burn"
import { DODGE } from "../../sim/status/subs/Dodge"
import { ROOTED } from "../../sim/status/subs/Rooted"
import { Vector2 } from "../../sim/base/Vector2"
import type { Indicator } from "../../sim/battle/Action"
import type { Battle } from "../../sim/battle/Battle"
import type { Unit } from "../../sim/battle/Unit"
import type { StatusType } from "../../sim/status/Status"

import { colorOf } from "../look/colors"
import type { BattleScene, SceneUnit } from "./BattleScene"
import type { UnitSprites } from "../look/UnitSprites"

/** The fewest pixels of the world a meter takes, however little room the arena is given. */
const MIN_METER = 6

/** How many pixels of the world a meter takes for a sprite to be drawn at its own size. */
const SPRITE_METER = 12

/**
 * The room kept over the arena, in meters: what the sprite of a unit of the base size stands out above the
 * wall it touches.
 */
const SPRITE_HEADROOM = 0.75

/** Half the height of a line of text, in pixels: a label is centered on its point. */
const LABEL_HALF_HEIGHT = 4

/** How long the head of an arrow is, at least, in pixels. */
const ARROW_HEAD = 5

/** The ink of the grid, as the paths of the map of the journey. */
const GRID = new Color(0.3, 0.2, 0.13, 0.35)
const INK = new Color(0.05, 0.04, 0.08)
const FIRE = new Color(1, 0.45, 0.1, 0.45)
const BOMB = new Color(0.08, 0.08, 0.1)
const FUSE = new Color(1, 0.3, 0.2)
const CHOSEN = new Color(1, 0.85, 0.35)
const ACTING = new Color(1, 1, 1)
const HIGHLIGHTED = new Color(0.45, 0.75, 1)
const HITBOX_FILL = new Color(1, 1, 1, 0.08)
const HITBOX_EDGE = new Color(1, 1, 1, 0.4)
const NOTICED = new Color(1, 0.95, 0.5)

/** How opaque the disc of the team under a sprite is: the body it takes, seen through. */
const SPRITE_DISC_ALPHA = 0.45

/** How far below the middle of the body the feet of a sprite stand, in pixels. */
const FEET_DROP = 1

/** Added to the size of a unit that is only found by the ground it covers: it ranks after any body. */
const ZONE_RANK = 100

/** Added to the size of a unit that takes no room: it ranks after a unit of the same size standing there. */
const GROUND_RANK = 0.01

/** How many sides the outline of a hitbox is drawn with. */
const HITBOX_SIDES = 24

/** How large the shade under a thing is, as a share of its size. */
const SHADE_SIZE = 1.5

/** How thick the lines of the grid are, in pixels. */
const GRID_THICKNESS = 2

/** The dot each status is shown by, under its unit. */
const STATUS_DOTS = new Map<StatusType, Color>([
    [BURN, new Color(1, 0.5, 0.1)], [ROOTED, new Color(0.3, 0.8, 0.3)], [DODGE, new Color(0.4, 0.9, 1)],
])

/** A rectangle of the world, in pixels. */
export interface WorldRect {
    readonly left: number
    readonly top: number
    readonly right: number
    readonly bottom: number
}

/**
 * The units to draw over the ground, in the order they overlap: those that take no room first, then each
 * one over the units farther up the arena, as a thing nearer the viewer stands over what lies behind it.
 * Those covering a zone are left out, drawn on the ground before. Units level with each other keep their
 * order.
 */
export function drawOrder(units: readonly SceneUnit[]): SceneUnit[] {
    return units
        .filter(shown => !shown.unit.zone)
        .sort((a, b) => Number(a.unit.tangible) - Number(b.unit.tangible) || a.position.y - b.position.y)
}

/**
 * The arena of the battle, drawn by its {@link ArenaView} each frame from the scene: the units where the
 * replay has them, what it shows over the arena, what it lights up, and the preview of what is hovered.
 *
 * @remarks
 * It owns no animation: the replay moves the scene, and the board only draws it. Positions and facings are
 * free. The grid on the floor marks the meters, a ruler
 * for the eye to judge distances and reaches, and nothing snaps to it.
 */
export class BoardView {


    /** The unit drawn with the ring of the one being planned, none when none is. */
    public chosen: Unit|null = null

    /** The unit drawn with the ring of the one acting, none when none is. */
    public acting: Unit|null = null

    /** The unit the pointer is over, in the arena or in the panels, ringed wider, none when none. */
    public highlighted: Unit|null = null

    /** What the action hovered would do, drawn over the arena, none when nothing is hovered. */
    public indicators: readonly Indicator[] = []

    constructor(
        font: BitmapFont, white: Sprite,

        /** What it draws of the battle. */
        public readonly scene: BattleScene,

        /** The pictures of the units, drawn over their body once loaded. */
        public readonly sprites: UnitSprites,
    ){
        this.#text = new TextLayout(font, 1)
        this.#white = white
    }


    /**
     * Fit the arena in a rectangle of the world, with room above it for the sprites of the units against
     * its top wall: as many whole pixels a meter as fit, centered. Fitting the same rectangle again changes
     * nothing.
     */
    public fit(battle: Battle, room: WorldRect): void {
        const { width, height } = battle.arena
        const tall = height + SPRITE_HEADROOM
        const meter = Math.max(MIN_METER, Math.floor(Math.min(
            (room.right - room.left) / width, (room.bottom - room.top) / tall,
        )))
        this.#meter = meter
        this.#left = Math.round((room.left + room.right - width * meter) / 2)
        this.#top = Math.round((room.top + room.bottom - tall * meter) / 2 + SPRITE_HEADROOM * meter)
    }

    /**
     * Where the hearts of a unit lie in the world, in its pixels: the middle of their bottom edge, just
     * over the unit. The interface draws them there.
     */
    public heartsAnchor(unit: Unit): readonly [number, number] {
        const [cx, cy] = this.#pixels(this.scene.of(unit)?.position ?? unit.position)
        const sprite = this.sprites.of(unit.sprite)
        if(sprite){
            const scale = this.#spriteScale(unit.stats.size.value)
            return [cx, cy + (FEET_DROP - sprite.height) * scale - 1]
        }
        const radius = unit.radius * this.#meter * (unit.vanishing ? 0.75 : 1)
        return [cx, cy - radius - 1]
    }

    /**
     * The living unit lying under a point of the world, none when none does: any unit, one that takes no
     * room and a pillar too. Where several lie there, the body that is hit first wins, the smallest of
     * them, so what lies under a unit never hides it; a ground covered only by the zone of a unit comes last.
     */
    public unitAt(x: number, y: number): Unit|null {
        const meter = this.#meter
        const at = new Vector2((x - this.#left) / meter, (y - this.#top) / meter)
        let found: Unit|null = null
        let best = Infinity
        for(const shown of this.scene.living){
            const { unit } = shown
            const [cx, cy] = this.#pixels(shown.position)
            const onBody = Math.hypot(x - cx, y - cy) <= unit.radius * meter + 1
            const onZone = unit.zone !== null && touches(unit.zone, at, 0)
            if(!onBody && !onZone) continue
            // A body lying on the ground comes after one standing, of the same size.
            const rank = (onBody ? 0 : ZONE_RANK) + unit.radius + (unit.tangible ? 0 : GROUND_RANK)
            if(rank <= best){
                best = rank
                found = unit
            }
        }
        return found
    }

    /** Draw the arena and what is shown over it. */
    public draw(painter: Painter, battle: Battle): void {
        // Pushed, so the tint left by the last unit does not color whatever the frame draws next.
        painter.push()
        // The shapes are cut from the white of the font texture, so they batch with the letters.
        painter.setWhitePixel(this.#white)
        this.#drawFloor(painter, battle)
        this.#drawHazards(painter)
        // The circles of the hitboxes lie under the sprites, which stand on them.
        const { width, height } = battle.arena
        painter.push()
        painter.clip(this.#left, this.#top, width * this.#meter, height * this.#meter)
        painter.setBlend("alpha")
        this.#drawHitboxes(painter)
        painter.pop()
        for(const shown of drawOrder(this.scene.living)) this.#drawUnit(painter, shown)
        // What is shown over the arena stays in it: a reach wider than the room is cut at its walls.
        painter.clip(this.#left, this.#top, width * this.#meter, height * this.#meter)
        painter.setBlend("alpha")
        for(const shown of this.scene.indicators) this.#drawIndicator(painter, shown, 1)
        for(const indicator of this.indicators) this.#drawIndicator(painter, indicator, 1)
        this.#drawNotice(painter)
        painter.setBlend("cutout")
        painter.pop()
    }


    readonly #text: TextLayout
    readonly #white: Sprite
    readonly #faded = new Color()

    /** How many pixels a meter takes. */
    #meter = MIN_METER

    /** Where the top left corner of the arena lies, in pixels of the world. */
    #left = 0
    #top = 0

    /**
     * The hitbox of every body, a pale disc with its edge: the units, the clones however small they look,
     * and the pillars. What touches what reads at a glance.
     */
    #drawHitboxes(painter: Painter): void {
        const bodies = this.#bodies().map(shown => ({ center: shown.position, radius: shown.unit.radius }))
        for(const { center, radius } of bodies){
            const [cx, cy] = this.#pixels(center)
            const pixels = radius * this.#meter
            painter.setTint(HITBOX_FILL)
            painter.circle(cx, cy, pixels)
            const edge = Array.from({ length: HITBOX_SIDES }, (_, side) => {
                const angle = side / HITBOX_SIDES * 2 * Math.PI
                return { x: cx + Math.cos(angle) * pixels, y: cy + Math.sin(angle) * pixels }
            })
            painter.setTint(HITBOX_EDGE)
            painter.multiLine(edge, 1, true)
        }
    }

    #drawFloor(painter: Painter, battle: Battle): void {
        const { width, height } = battle.arena
        const meter = this.#meter
        // No floor of its own: the paper under the arena shows, the grid lying on it.
        painter.setTint(GRID)
        // The lines of the grid have the picture of the paths of the map of the journey, when loaded.
        const rope = this.sprites.rope
        const line = (ax: number, ay: number, bx: number, by: number): void => {
            if(rope) rope.draw(painter, { x: ax, y: ay }, { x: bx, y: by }, GRID_THICKNESS)
            else painter.rect(Math.min(ax, bx), Math.min(ay, by), Math.max(1, bx - ax), Math.max(1, by - ay))
        }
        const right = this.#left + width * meter
        const bottom = this.#top + height * meter
        for(let x = 1; x < width; x++) line(this.#left + x * meter, this.#top, this.#left + x * meter, bottom)
        for(let y = 1; y < height; y++) line(this.#left, this.#top + y * meter, right, this.#top + y * meter)
    }

    /** The darker spot under a thing of the arena, centered on it, as wide as 1.5 times its size in pixels. */
    #drawShade(painter: Painter, cx: number, cy: number, size: number, opacity = 1): void {
        const shade = this.sprites.shade
        if(!shade) return
        const scale = size * SHADE_SIZE / shade.width
        painter.setBlend("alpha")
        painter.setTint(this.#faded.set(1, 1, 1, opacity))
        painter.push()
        painter.translate(Math.round(cx - shade.width * scale / 2), Math.round(cy - shade.height * scale / 2))
        painter.scale(scale, scale)
        // The picture is faint: drawn twice, it darkens the paper enough to tell where a thing stands.
        painter.sprite(shade, 0, 0)
        painter.sprite(shade, 0, 0)
        painter.pop()
        painter.setBlend("cutout")
    }

    /**
     * The bodies lying on the ground, under those standing: the picture of those that have one, the zones the
     * others cover, a bomb as a bomb.
     */
    #drawHazards(painter: Painter): void {
        for(const { unit, position } of this.scene.living){
            const zone = unit.zone
            if(!zone) continue
            const sprite = this.sprites.of(unit.sprite)
            if(sprite){
                const [x, y] = this.#pixels(position)
                this.#drawShade(painter, x, y, this.#meter)
                painter.setBlend("alpha")
                // What it covers shows under its picture, when it acts on the whole of its zone.
                if(unit.sprite === "fire" || unit.sprite === "puddle"){
                    const { r, g, b, a } = unit.color
                    painter.setTint(unit.sprite === "fire" ? FIRE : this.#faded.set(r, g, b, a))
                    this.#fillPolygon(painter, outline(zone))
                }
                painter.setTint(this.#faded.set(1, 1, 1, 1))
                const scale = this.#spriteScale(1)
                painter.push()
                const left = Math.round(x - sprite.width * scale / 2)
                painter.translate(left, Math.round(y + (FEET_DROP - sprite.height) * scale))
                painter.scale(scale, scale)
                painter.sprite(sprite, 0, 0)
                painter.pop()
                painter.setBlend("cutout")
                continue
            }
            if(unit.sprite !== "bomb"){
                painter.setBlend("alpha")
                const { r, g, b, a } = unit.color
                painter.setTint(unit.sprite === "fire" ? FIRE : this.#faded.set(r, g, b, a))
                this.#fillPolygon(painter, outline(zone))
                painter.setBlend("cutout")
                continue
            }
            const [cx, cy] = this.#pixels(position)
            this.#drawShade(painter, cx, cy, 6)
            painter.setTint(BOMB)
            painter.circle(cx, cy, 3)
            painter.setTint(FUSE)
            painter.rect(cx + 1, cy - 4, 2, 2)
        }
    }

    #drawUnit(painter: Painter, shown: SceneUnit): void {
        const { unit } = shown
        const [cx, cy] = this.#pixels(shown.position)
        const radius = unit.radius * this.#meter * (unit.vanishing ? 0.75 : 1)
        this.#drawShade(painter, cx, cy, unit.stats.size.value * this.#meter * (unit.vanishing ? 0.75 : 1), shown.opacity)
        if(unit === this.highlighted){
            painter.setTint(HIGHLIGHTED)
            painter.circle(cx, cy, radius + 3)
        }
        const ring = unit === this.chosen ? CHOSEN : unit === this.acting ? ACTING : null
        if(ring){
            painter.setTint(ring)
            painter.circle(cx, cy, radius + 1.5)
        }
        const { r, g, b, a } = colorOf(unit)
        const sprite = this.sprites.of(unit.sprite)
        if(sprite){
            this.#drawSprite(painter, shown, sprite, cx, cy, radius)
            this.#drawStatuses(painter, shown, cx - radius, cy + radius + 1)
            return
        }
        painter.setTint(this.#faded.set(r, g, b, a * shown.opacity))
        painter.circle(cx, cy, radius)
        const ahead = shown.direction
        const side = ahead.right
        const tip = radius + 3
        painter.triangle(
            cx + ahead.x * tip, cy + ahead.y * tip,
            cx + ahead.x * (radius - 1) + side.x * 2.5, cy + ahead.y * (radius - 1) + side.y * 2.5,
            cx + ahead.x * (radius - 1) - side.x * 2.5, cy + ahead.y * (radius - 1) - side.y * 2.5,
        )
        painter.setTint(INK)
        this.#text.draw(painter, unit.name.slice(0, 1), Math.round(cx) - 1, Math.round(cy) - 4)
        this.#drawStatuses(painter, shown, cx - radius, cy + radius + 1)
    }

    /**
     * A unit as its sprite: the disc of its body in the color of its team, seen through, a tick where it
     * faces, then the sprite standing on it, turned the way it faces, fading as it blinks.
     */
    #drawSprite(
        painter: Painter, shown: SceneUnit, sprite: Sprite, cx: number, cy: number, radius: number,
    ): void {
        const { r, g, b, a } = colorOf(shown.unit)
        const ahead = shown.direction
        painter.setBlend("alpha")
        // Scenery has no team disc and faces nowhere: its picture alone stands there.
        if(shown.unit.targetable){
            painter.setTint(this.#faded.set(r, g, b, a * SPRITE_DISC_ALPHA * shown.opacity))
            painter.circle(cx, cy, radius)
            const side = ahead.right
            const tip = radius + 2
            painter.setTint(this.#faded.set(r, g, b, a * shown.opacity))
            painter.triangle(
                cx + ahead.x * tip, cy + ahead.y * tip,
                cx + ahead.x * radius + side.x * 1.5, cy + ahead.y * radius + side.y * 1.5,
                cx + ahead.x * radius - side.x * 1.5, cy + ahead.y * radius - side.y * 1.5,
            )
        }
        painter.setTint(this.#faded.set(1, 1, 1, shown.opacity))
        const scale = this.#spriteScale(shown.unit.stats.size.value)
        const width = sprite.width * scale
        const left = Math.round(cx - width / 2)
        const top = Math.round(cy + (FEET_DROP - sprite.height) * scale)
        painter.push()
        painter.translate(ahead.x < 0 ? left + width : left, top)
        painter.scale(ahead.x < 0 ? -scale : scale, scale)
        painter.sprite(sprite, 0, 0)
        painter.pop()
        painter.setBlend("cutout")
    }

    /** How large a sprite is drawn for a body of a size: it follows the body as the arena shows it. */
    #spriteScale(size: number): number {
        return size * this.#meter / SPRITE_METER
    }

    #drawStatuses(painter: Painter, shown: SceneUnit, left: number, top: number): void {
        let x = Math.round(left)
        for(const type of shown.statuses){
            const { r, g, b } = type.color
            painter.setTint(STATUS_DOTS.get(type) ?? this.#faded.set(r, g, b, 1))
            painter.rect(x, Math.round(top), 3, 3)
            x += 4
        }
    }

    /** The units standing whose body takes room, where the scene has them. */
    #bodies(): SceneUnit[] {
        return this.scene.living.filter(shown => shown.unit.tangible)
    }

    /** Light up what is about to act: a ring around its unit, and its word over it. */
    #drawNotice(painter: Painter): void {
        const notice = this.scene.notice
        const shown = notice ? this.scene.of(notice.unit) : undefined
        if(!notice || !shown) return
        const [cx, cy] = this.#pixels(shown.position)
        const radius = shown.unit.radius * this.#meter + 2
        const edge = Array.from({ length: HITBOX_SIDES }, (_, side) => {
            const angle = side / HITBOX_SIDES * 2 * Math.PI
            return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }
        })
        painter.setTint(NOTICED)
        painter.multiLine(edge, 1, true)
        const left = Math.round(cx - this.#text.widthOf(notice.word) / 2)
        this.#text.draw(painter, notice.word, left, Math.round(cy - radius - 2 * LABEL_HALF_HEIGHT - 2))
    }

    /** Draw an indicator in its color, its opacity scaled by how much of it is left. */
    #drawIndicator(painter: Painter, indicator: Indicator, opacity: number): void {
        const { r, g, b, a } = indicator.color
        painter.setTint(this.#faded.set(r, g, b, a * opacity))
        switch(indicator.kind){
            case "polygon":
                this.#fillPolygon(painter, indicator.points)
                break
            case "arrow":
                const points = indicator.points.map(point => this.#pixels(point))
                drawArrow(painter, points, indicator.width * this.#meter)
                break
            case "label": {
                const [x, y] = this.#pixels(indicator.at)
                const left = Math.round(x - this.#text.widthOf(indicator.text) / 2)
                this.#text.draw(painter, indicator.text, left, Math.round(y - LABEL_HALF_HEIGHT))
                break
            }
            default:
                break
        }
    }

    /** Fill a polygon of the arena its first point sees whole, as a fan of triangles from that point. */
    #fillPolygon(painter: Painter, points: readonly Vector2[]): void {
        const pixels = points.map(point => this.#pixels(point))
        const [first] = pixels
        if(!first) return
        for(let i = 1; i + 1 < pixels.length; i++){
            const [bx, by] = pixels[i]
            const [cx, cy] = pixels[i + 1]
            painter.triangle(first[0], first[1], bx, by, cx, cy)
        }
    }

    /** A point of the arena, in pixels of the world. */
    #pixels(point: Vector2): [number, number] {
        return [this.#left + point.x * this.#meter, this.#top + point.y * this.#meter]
    }
}

/** Draw a line through points, a head at the last one pointing the way of the last stretch. */
function drawArrow(painter: Painter, points: readonly [number, number][], width: number): void {
    if(points.length < 2) return
    const thickness = Math.max(1, width)
    const [tx, ty] = points[points.length - 1]
    const [px, py] = points[points.length - 2]
    const length = Math.hypot(tx - px, ty - py)
    if(length === 0) return
    const ux = (tx - px) / length
    const uy = (ty - py) / length
    // The head never longer than the last stretch, so a short move still points the right way.
    const head = Math.min(length, Math.max(ARROW_HEAD, thickness * 3))
    const backX = tx - ux * head
    const backY = ty - uy * head
    // The line stops at the back of the head, so it does not poke through the tip.
    const line = [...points.slice(0, -1), [backX, backY] as const].map(([x, y]) => ({ x, y }))
    painter.multiLine(line, thickness)
    const half = head * 0.6
    painter.triangle(tx, ty, backX - uy * half, backY + ux * half, backX + uy * half, backY - ux * half)
}
