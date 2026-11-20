import type { Visual } from "../../sim/base/Visual"
import type { Painter, Sprite } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { TextLayout } from "../../../../engine/text"
import type { BitmapFont } from "../../../../engine/text"
import * as Areas from "../../sim/battle/area/Areas"
import { Vector2 } from "../../sim/base/Vector2"
import { Disk } from "../../sim/battle/hitbox/Disk"
import type { Hitbox } from "../../sim/battle/hitbox/Hitbox"
import type { Indicator } from "../../sim/battle/preview/Preview"
import type { Battle } from "../../sim/battle/Battle"
import type { Unit } from "../../sim/battle/Unit"

import { colorOf, NOTICE_EDGE } from "../look/colors"
import type { BattleScene, SceneUnit } from "./BattleScene"
import { hitboxMetrics } from "../look/hitboxMetrics"
import { drawSprite, FEET_DROP, modeOf, SPRITE_METER, spriteReach } from "../look/spriteModes"
import type { SpriteView } from "../look/spriteModes"
import type { UnitSprites } from "../look/UnitSprites"

/** The fewest pixels of the world a meter takes, however little room the arena is given. */
const MIN_METER = 6

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
const NOTICED = NOTICE_EDGE

/** The dot of a hazard in the tactical view. */
const TACTICAL_MARK = new Color(1, 1, 1, 0.6)

/** The color of the hitbox of a thing without a team: pillars, walls, the ground. */
const NEUTRAL = new Color(1, 1, 1)

/** How opaque the inside and the edge of a hitbox are, and how thick the edge is in pixels. */
const HITBOX_FILL = 0.12
const HITBOX_EDGE = 0.6

/** The same for a hitbox that is lit: the one planned, acting or hovered. */
const LIT_FILL = 0.3
const LIT_EDGE = 1
const LIT_THICKNESS = 2

/** How opaque the inside of a hitbox is where nothing else shows the body: no picture, or the tactical view. */
const BARE_FILL = 0.5

/** How far the arrow of the front stands out of the hitbox, and how wide its base is, in pixels. */
const FRONT_ARROW = 4
const FRONT_ARROW_BASE = 3

/** Added to the size of a unit that is only found by the ground it covers: it ranks after any body. */
const ZONE_RANK = 100

/** Added to the size of a unit that takes no room: it ranks after a unit of the same size standing there. */
const GROUND_RANK = 0.01

/** How thick a tie between two units is drawn, in meters. */
const TETHER_THICKNESS = 0.2

/** How much smaller a clone is drawn than it is. */
const VANISHING_SCALE = 0.75

/** The eight ways a lit sprite is drawn again around itself to outline it, in pixels. */
const AROUND: readonly (readonly [number, number])[] = [
    [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
]

/** How many sides the outline of a hitbox is drawn with. */
const HITBOX_SIDES = 24

/** How far the shade under a body lies out of its hitbox, on every side, in meters. */
const SHADE_MARGIN = 0.1

/** How thick the lines of the grid are, in pixels. */
const GRID_THICKNESS = 2

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


    /** The unit whose hitbox is lit as the one being planned, none when none is. */
    public chosen: Unit|null = null

    /** The unit whose hitbox is lit as the one acting, none when none is. */
    public acting: Unit|null = null

    /** The unit the pointer is over, in the arena or in the panels, its hitbox lit, none when none. */
    public highlighted: Unit|null = null

    /** What the action hovered would do, drawn over the arena, none when nothing is hovered. */
    public indicators: readonly Indicator[] = []

    /** Is the arena drawn as a plan: no shade, no picture, each body as its disc alone? */
    public tactical = false

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
        const shown = this.scene.of(unit)
        const pose = { position: shown?.position ?? unit.position, direction: shown?.direction ?? unit.direction }
        const [cx, cy] = this.#pixels(pose.position)
        const sprite = this.tactical ? null : this.sprites.of(unit.sprite)
        if(sprite){
            const look = this.sprites.look(unit.sprite)
            const mode = modeOf(look, unit.hitbox)
            return [cx, cy - spriteReach(sprite, mode, look, hitboxMetrics(unit.hitbox, pose), this.#view()) - 1]
        }
        const radius = unit.radius * this.#meter * (unit.vanishing ? 0.75 : 1)
        return [cx, cy - radius - 1]
    }

    /** Where the middle of the top edge of what lies under a unit, its statuses, is, in virtual pixels of the arena. */
    public feetAnchor(unit: Unit): readonly [number, number] {
        const [cx, cy] = this.#pixels(this.scene.of(unit)?.position ?? unit.position)
        return [cx, cy + unit.radius * this.#meter * (unit.vanishing ? 0.75 : 1) + 1]
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
            const onBody = unit.hitbox.gapToDisk(shown, new Disk(1 / meter), { position: at, direction: shown.direction }) <= 0
            const onZone = unit.zone !== null && Areas.checkPoint(unit.zone, at)
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
        // The shades and the hitboxes lie under the sprites, which stand on them.
        const { width, height } = battle.arena
        const standing = drawOrder(this.scene.living)
        painter.push()
        painter.clip(this.#left, this.#top, width * this.#meter, height * this.#meter)
        painter.setBlend("alpha")
        for(const shown of standing) this.#drawBody(painter, shown)
        this.#drawTethers(painter)
        painter.pop()
        for(const shown of standing) this.#drawUnit(painter, shown)
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
     * What lies under a unit: its shade, then its hitbox, the exact shape it is hit and clicked by, seen through,
     * in the color of the unit, white for what has no team, and the arrow of where it faces. It is lit while the
     * unit is planned, acting or hovered. A body that takes no room has its hitbox too: it is what is clicked.
     */
    #drawBody(painter: Painter, shown: SceneUnit): void {
        const { unit } = shown
        const lit = this.#isLit(unit)
        const hitbox = this.#hitboxOf(unit)
        this.#drawShade(painter, shown, hitbox)
        painter.setBlend("alpha")
        const { r, g, b } = unit.targetable ? colorOf(unit) : NEUTRAL
        const bare = this.tactical || !this.sprites.of(unit.sprite)
        const fill = lit ? LIT_FILL : bare ? BARE_FILL : HITBOX_FILL
        const corners = this.#cornersOf(shown, hitbox)
        painter.setTint(this.#faded.set(r, g, b, fill * shown.opacity))
        painter.polygon(corners)
        painter.setTint(this.#faded.set(r, g, b, (lit ? LIT_EDGE : HITBOX_EDGE) * shown.opacity))
        painter.multiLine(corners, lit ? LIT_THICKNESS : 1, true)
        if(!unit.targetable) return
        // The arrow stands on the front of the shape, in the same color as the edge.
        const [cx, cy] = this.#pixels(shown.position)
        const ahead = shown.direction
        const side = ahead.right
        const front = hitbox.extent[0] / 2 * this.#meter
        const tip = front + FRONT_ARROW
        painter.triangle(
            cx + ahead.x * tip, cy + ahead.y * tip,
            cx + ahead.x * front + side.x * FRONT_ARROW_BASE, cy + ahead.y * front + side.y * FRONT_ARROW_BASE,
            cx + ahead.x * front - side.x * FRONT_ARROW_BASE, cy + ahead.y * front - side.y * FRONT_ARROW_BASE,
        )
    }

    /** The hitbox of a unit as the board shows it: a clone is drawn smaller than it is. */
    #hitboxOf(unit: Unit): Hitbox {
        return unit.vanishing ? unit.hitbox.scaled(VANISHING_SCALE) : unit.hitbox
    }

    /**
     * The ties between units, from one to the other where the scene has them: the picture of the tie stretched,
     * a plain line in its color while it has none, under the sprites.
     */
    #drawTethers(painter: Painter): void {
        for(const { from, to, visual } of this.scene.tethers){
            const a = this.scene.of(from)
            const b = this.scene.of(to)
            if(!a?.alive || !b?.alive) continue
            const [ax, ay] = this.#pixels(a.position)
            const [bx, by] = this.#pixels(b.position)
            painter.setTint(this.#coloredBy(visual, 1))
            const rope = this.sprites.tether(visual)
            if(rope) rope.draw(painter, { x: ax, y: ay }, { x: bx, y: by }, TETHER_THICKNESS * this.#meter)
            else painter.multiLine([{ x: ax, y: ay }, { x: bx, y: by }], Math.max(1, TETHER_THICKNESS * this.#meter / 3), false)
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

    /**
     * The darker spot under a body: the rectangle around its hitbox, turned the way it faces, with a margin
     * of a few centimeters more on every side, the picture stretched over it.
     */
    #drawShade(painter: Painter, shown: SceneUnit, hitbox: Hitbox): void {
        const shade = this.sprites.shade
        if(!shade || this.tactical) return
        const [length, width] = hitbox.extent
        const [cx, cy] = this.#pixels(shown.position)
        painter.setBlend("alpha")
        painter.setTint(this.#faded.set(1, 1, 1, shown.opacity))
        painter.push()
        painter.translate(Math.round(cx), Math.round(cy))
        painter.rotate(Math.atan2(shown.direction.y, shown.direction.x))
        painter.scale(
            (length + 2 * SHADE_MARGIN) * this.#meter / shade.width,
            (width + 2 * SHADE_MARGIN) * this.#meter / shade.height,
        )
        // The picture is faint: drawn twice, it darkens the paper enough to tell where a thing stands.
        painter.sprite(shade, -shade.width / 2, -shade.height / 2)
        painter.sprite(shade, -shade.width / 2, -shade.height / 2)
        painter.pop()
        painter.setBlend("cutout")
    }

    /**
     * The bodies lying on the ground, under those standing: each as its picture, or as a dot of the color its
     * visual gives where it has none.
     */
    #drawHazards(painter: Painter): void {
        for(const shown of this.scene.living){
            const { unit, position } = shown
            if(!unit.zone) continue
            const [x, y] = this.#pixels(position)
            if(this.tactical){
                painter.setBlend("alpha")
                painter.setTint(TACTICAL_MARK)
                painter.circle(x, y, Math.max(3, unit.radius * this.#meter))
                painter.setBlend("cutout")
                continue
            }
            const sprite = this.sprites.of(unit.sprite)
            if(!sprite){
                const [r, g, b] = unit.sprite?.color ?? [1, 1, 1]
                this.#drawShade(painter, shown, unit.hitbox)
                painter.setBlend("alpha")
                painter.setTint(this.#faded.set(r, g, b, 1))
                painter.circle(x, y, 3)
                painter.setBlend("cutout")
                continue
            }
            this.#drawShade(painter, shown, unit.hitbox)
            painter.setBlend("alpha")
            painter.setTint(this.#coloredBy(unit.sprite, 1))
            const scale = this.#spriteScale(1)
            painter.push()
            const left = Math.round(x - sprite.width * scale / 2)
            painter.translate(left, Math.round(y + (FEET_DROP - sprite.height) * scale))
            painter.scale(scale, scale)
            painter.sprite(sprite, 0, 0)
            painter.pop()
            painter.setBlend("cutout")
        }
    }

    #drawUnit(painter: Painter, shown: SceneUnit): void {
        // In the tactical view the hitbox under it is all there is of a unit.
        if(this.tactical) return
        const { unit } = shown
        const [cx, cy] = this.#pixels(shown.position)
        const sprite = this.sprites.of(unit.sprite)
        if(sprite){
            this.#drawSprite(painter, shown, sprite)
            return
        }
        painter.setTint(INK)
        this.#text.draw(painter, unit.name.slice(0, 1), Math.round(cx) - 1, Math.round(cy) - 4)
    }

    /** A unit as its sprite, drawn over its hitbox the way its look says, mirrored where it faces left, fading as it blinks. */
    #drawSprite(painter: Painter, shown: SceneUnit, sprite: Sprite): void {
        const { unit } = shown
        const look = this.sprites.look(unit.sprite)
        painter.setBlend("alpha")
        const mode = modeOf(look, unit.hitbox)
        const metrics = hitboxMetrics(unit.hitbox, shown)
        if(this.#isLit(unit)){
            painter.setColorMode("mask")
            painter.setTint(this.#faded.set(1, 1, 1, shown.opacity))
            for(const [dx, dy] of AROUND){
                painter.push()
                painter.translate(dx, dy)
                drawSprite(painter, sprite, mode, look, metrics, this.#view())
                painter.pop()
            }
            painter.setColorMode("modulate")
        }
        painter.setTint(this.#coloredBy(unit.sprite, shown.opacity))
        drawSprite(painter, sprite, mode, look, metrics, this.#view())
        painter.setBlend("cutout")
    }

    /** Is a unit planned, acting or hovered: lit, its hitbox and its sprite outlined? */
    #isLit(unit: Unit): boolean {
        return unit === this.chosen || unit === this.acting || unit === this.highlighted
    }

    /** Where the arena lies on the screen, for the pictures to be drawn in it. */
    #view(): SpriteView {
        return { meter: this.#meter, pixels: point => this.#pixels(point) }
    }

    /** The corners of the outline of a body, in virtual pixels of the arena. */
    #cornersOf(shown: SceneUnit, hitbox: Hitbox = shown.unit.hitbox): { x: number, y: number }[] {
        return hitbox.outline(shown).map(point => {
            const [x, y] = this.#pixels(point)
            return { x, y }
        })
    }

    /** How large a sprite is drawn for a body of a size: it follows the body as the arena shows it. */
    #spriteScale(size: number): number {
        return size * this.#meter / SPRITE_METER
    }

    /** The tint to draw the picture of a visual with: its coloration multiplies it here, none leaves it as it is. */
    #coloredBy(visual: Visual|null, opacity: number): Color {
        const [r, g, b] = visual?.coloration ?? [1, 1, 1]
        return this.#faded.set(r, g, b, opacity)
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
