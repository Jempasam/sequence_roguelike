import { Rng } from "../../sim/base/Rng"

/** How much of the free room of a map the pieces are meant to cover, from 0 to 1. */
const COVER = 0.35

/** How far apart the spots a piece may take are, in virtual pixels. */
const SPOT_STEP = 4

/** How much of its size a piece keeps away from the tokens and the paths: the larger, the farther. */
const MARGIN_RATE = 0.2

/** How far apart the edges of two pieces stay at least, in virtual pixels. */
const CLEARANCE = 2

/** Half the size of a token, as far as pieces are concerned, in virtual pixels. */
const TOKEN_RADIUS = 14

/** Half the thickness of a path, as far as pieces are concerned, in virtual pixels. */
const PATH_RADIUS = 3

/** A point of the map, in virtual pixels. */
export interface MapPoint {
    readonly x: number
    readonly y: number
}

/** A path of the map, from the middle of a token to the middle of another. */
export interface MapPath {
    readonly from: MapPoint
    readonly to: MapPoint
}

/** The size of something, in virtual pixels. */
export interface PieceSize {
    readonly width: number
    readonly height: number
}

/** What pieces are laid around. */
export interface MapLayout {
    readonly size: PieceSize

    /** The centers of the tokens. */
    readonly tokens: readonly MapPoint[]
    readonly paths: readonly MapPath[]
}

/** A point of the map a piece may be centered on. */
interface Spot extends MapPoint {
    /** How far it lies from the nearest token or path, their edges, in virtual pixels. */
    readonly room: number
}

/** A piece laid on the map, by its top left corner. */
export interface ScatteredPiece extends MapPoint {
    /** Its rank among the pieces given. */
    readonly piece: number
}

/**
 * Pieces laid at random over a map, away from its tokens and its paths, and from each other: the largest
 * first, then the smaller ones in the holes left. Each comes as many times as {@link quantities} says, as
 * long as a spot is left for it.
 */
export function scatter(seed: number, pieces: readonly PieceSize[], map: MapLayout): ScatteredPiece[] {
    if(pieces.length === 0) return []
    const rng = new Rng(seed)
    const field = spotsOf(map)
    const spots = pieces.map(piece => clearSpots(piece, field, map.size))
    const free = Math.max(...spots.map(each => each.length)) * SPOT_STEP ** 2
    const counts = quantities(pieces, free)
    const laid: ScatteredPiece[] = []
    const largestFirst = pieces.map((_, piece) => piece).sort((a, b) => sizeOf(pieces[b]) - sizeOf(pieces[a]))
    for(const piece of largestFirst){
        rng.shuffle(spots[piece])
        const wanted = laid.length + counts[piece]
        for(const spot of spots[piece]){
            if(laid.length === wanted) break
            const candidate = { piece, ...spot }
            if(laid.every(other => apart(candidate, other, pieces))) laid.push(candidate)
        }
    }
    return laid
}

/**
 * How many times each piece comes to cover a share of some room: twice smaller, twice as many. A piece comes
 * at least once.
 *
 * @param room - The room to cover, in square virtual pixels.
 */
export function quantities(pieces: readonly PieceSize[], room: number): number[] {
    // Each piece covers its size squared, so all of them at a count of `scale / size` cover `scale * sizes`.
    const sizes = pieces.reduce((sum, piece) => sum + sizeOf(piece), 0)
    const scale = COVER * room / sizes
    return pieces.map(piece => Math.max(1, Math.round(scale / sizeOf(piece))))
}

/** How large a piece is, in virtual pixels: the longest of its sides. */
function sizeOf({ width, height }: PieceSize): number {
    return Math.max(width, height)
}

/** The points of the map a piece may be centered on, each with its room, measured once for all pieces. */
function spotsOf({ size, tokens, paths }: MapLayout): Spot[] {
    const spots: Spot[] = []
    for(let y = 0; y <= size.height; y += SPOT_STEP){
        for(let x = 0; x <= size.width; x += SPOT_STEP){
            const point = { x, y }
            const fromTokens = tokens.map(token => distance(token, point) - TOKEN_RADIUS)
            const fromPaths = paths.map(path => distanceToPath(path, point) - PATH_RADIUS)
            spots.push({ x, y, room: Math.min(...fromTokens, ...fromPaths) })
        }
    }
    return spots
}

/** Where a piece may lie, by its top left corner: inside the map, far enough from the tokens and the paths. */
function clearSpots(piece: PieceSize, field: readonly Spot[], size: PieceSize): MapPoint[] {
    const margin = sizeOf(piece) * (0.5 + MARGIN_RATE)
    const corners = field.filter(({ room }) => room >= margin).map(({ x, y }) => {
        return { x: Math.floor(x - piece.width / 2), y: Math.floor(y - piece.height / 2) }
    })
    return corners.filter(({ x, y }) => {
        return x >= 0 && y >= 0 && x + piece.width <= size.width && y + piece.height <= size.height
    })
}

/** Whether two pieces laid stay clear of each other. */
function apart(one: ScatteredPiece, other: ScatteredPiece, pieces: readonly PieceSize[]): boolean {
    const reach = (sizeOf(pieces[one.piece]) + sizeOf(pieces[other.piece])) / 2 + CLEARANCE
    return distance(centerOf(one, pieces), centerOf(other, pieces)) >= reach
}

/** The middle of a piece laid. */
function centerOf({ piece, x, y }: ScatteredPiece, pieces: readonly PieceSize[]): MapPoint {
    return { x: x + pieces[piece].width / 2, y: y + pieces[piece].height / 2 }
}

/** How far apart two points are. */
function distance(from: MapPoint, to: MapPoint): number {
    return Math.hypot(from.x - to.x, from.y - to.y)
}

/** How far a point lies from the nearest point of a path. */
function distanceToPath({ from, to }: MapPath, point: MapPoint): number {
    const across = to.x - from.x
    const along = to.y - from.y
    const length = across ** 2 + along ** 2
    const projected = ((point.x - from.x) * across + (point.y - from.y) * along) / length
    const share = length === 0 ? 0 : Math.min(1, Math.max(0, projected))
    return distance({ x: from.x + share * across, y: from.y + share * along }, point)
}
