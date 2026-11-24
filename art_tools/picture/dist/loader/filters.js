/**
 * Filters: one `objectLoader` per `effects.js` function, mapping named JSON parameters onto its
 * positional arguments. Every default here is copied from the effect's own default, so a filter
 * loaded from its bare name behaves exactly like calling the effect with no extra arguments.
 *
 * A filter itself is `(picture: Picture) => Picture` — `build` closes over the loaded values and
 * returns that function, it does not run the effect itself.
 */
import { objectLoader, registryLoader, listLoader, LoadError } from "./kit.js";
import { integer, choice, vectorList, materialSet, materialWeights, materialIndexOrNone } from "./params.js";
import effects from "../effects.js";
/**
 * `broken`'s third argument is three things at once: a fixed depth (the default, -1 — which
 * *empties* the shattered cells, matching the effect's name), `{offset}` to lower a cell's own
 * depth by that much (floored at 1), or "leave depth untouched". That last case is spelled
 * `undefined` in the effect body, but a JS default parameter substitutes its own default for a
 * real `undefined` before the body ever runs — the body's loose `depth==undefined` check only
 * ever fires for an explicit `null`. There is no existing param kind for this shape, so this is a
 * small one-off one; it surfaces "leave untouched" as `null`, the only value that actually reaches
 * it.
 * @param {{default: number, description?: string}} spec
 * @returns {import("./params.js").ParamKind}
 */
function brokenDepth({ default: fallback, description }) {
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (value === null)
                return undefined;
            if (typeof value === "number")
                return value;
            if (value !== null && typeof value === "object" && !Array.isArray(value)
                && typeof ( /** @type {any} */(value)).offset === "number") {
                return { offset: /** @type {any} */ (value).offset };
            }
            throw new LoadError(path, `expected a depth number, {"offset": number}, or null to leave depth untouched, got ${JSON.stringify(value)}`);
        },
        schema() {
            return {
                oneOf: [
                    { type: "number" },
                    { type: "object", properties: { offset: { type: "number" } }, required: ["offset"], additionalProperties: false },
                    { type: "null" },
                ],
                ...(description && { description }),
            };
        },
    };
}
/** A filter with no parameters — most of the 23 just call another effect with fixed arguments. */
function noParams(id, description) {
    return objectLoader({ id, description, build: () => picture => effects[id](picture) });
}
/** Every filter, by id. */
export const FILTER_LOADERS = {
    normal: noParams("normal", "Returns the picture unchanged — the identity filter."),
    burning: noParams("burning", "Shatters the picture (`broken`, forcing shards to material 2 at depth 0), darkens materials 0 and 1 toward soot, and recolours material 2 as glowing orange embers."),
    burned: noParams("burned", "Shatters the picture with `broken`'s own defaults (punches holes at scattered cells) and darkens materials 0 and 3 toward soot."),
    fiery: noParams("fiery", "Drips material 1 upward onto empty cells (`drippy`), turns material 0 into fading embers, dims material 1, turns material 2 into bright flame-yellow, turns material 3 into a darker echo of material 0, and dithers some lower-half material-0 pixels onto material 3."),
    furry: noParams("furry", "Grows one-pixel spikes from materials 0 and 3 in all eight directions (`excroissances`) and recolours material 0 toward a duller, more reflective brown."),
    auto_depth: noParams("auto_depth", "Fills any missing depth (`thickness_depth`), raises pixels sitting at a local depth ridge over two passes, then raises every pixel whose material isn't 0 by one more level."),
    thickness_depth: noParams("thickness_depth", "Flood-fills every empty (depth -1) pixel with one more than the shallowest depth among its already-filled orthogonal neighbours, spreading outward until nothing is left empty."),
    sayan: noParams("sayan", "Turns material 0 golden and material 2 pure blue, brightens both, then drips material 0 upward (material 2 restricted to drip only onto itself)."),
    slimy: noParams("slimy", "Tints every material green, most strongly on material 0, adds reflection to materials 0-2, and drips material 0 downward."),
    zombie: noParams("zombie", "Shatters the picture with `broken`'s defaults, then pushes material 0 toward sickly green and material 1 toward red."),
    drug: noParams("drug", "Spreads materials 1 and 2 into their orthogonal (and sometimes next-orthogonal) neighbours, deepening each copied pixel by one level."),
    weird: noParams("weird", "Shifts every odd row one pixel left (dropping its last column) and pushes material 0 toward blue and material 2 toward red."),
    thin: noParams("thin", "Lowers every non-empty pixel's depth by one."),
    fato: noParams("fato", "Raises every pixel's depth by one, then fills empty cells that have four occupied pixels in a row in some direction with a slightly shallower copy of the nearest one."),
    // look_right's own name is the direction the pixels move, but look_left/up/down name the
    // viewer's turn instead — turning your head right slides the world left, so look_left calls
    // look_right with dx=1 (a rightward pixel shift), look_up calls it with dy=1 (a downward
    // shift, since +y is down), and look_down with dy=-1. Read literally against look_right's own
    // parameters, the names look backwards; they are not, once you read them as "look toward".
    look_left: noParams("look_left", "Parallax-shifts the picture as if looking left: `look_right` with dx=1, dy=0."),
    look_up: noParams("look_up", "Parallax-shifts the picture as if looking up: `look_right` with dx=0, dy=1."),
    look_down: noParams("look_down", "Parallax-shifts the picture as if looking down: `look_right` with dx=0, dy=-1."),
    look_right: objectLoader({
        id: "look_right",
        description: "Parallax-shifts the picture as if looking right: moves every pixel deeper than half the picture's peak depth by (dx, dy), pulling in the next pixel further along to replace what moved (or emptying it, at the border).",
        params: {
            dx: integer({ default: -1, description: "Horizontal shift, in pixels, applied to the top half (by depth) of the picture." }),
            dy: integer({ default: 0, description: "Vertical shift, in pixels, applied to the top half (by depth) of the picture." }),
        },
        build: ({ dx, dy }) => picture => effects.look_right(picture, dx, dy),
    }),
    excroissances: objectLoader({
        id: "excroissances",
        description: "For every currently-empty cell that is backed by a wall pixel along one of `directions` (and empty on the other sides checked), grows a one-pixel spike of the wall's own material outward, thickening the wall behind it.",
        params: {
            directions: vectorList({
                default: [[1, 0], [-1, 0], [0, 1], [0, -1]],
                description: "Offsets, each [dx, dy], along which a spike may be grown from an exposed wall.",
            }),
            materials: materialSet({
                default: { 0: true, 1: true, 2: true, 3: true },
                description: "Which material indexes on the wall are allowed to sprout a spike.",
            }),
        },
        build: ({ directions, materials }) => picture => effects.excroissances(picture, directions, materials),
    }),
    ghost: objectLoader({
        id: "ghost",
        description: "Drips materials 1-3 downward by up to two pixels (`drippy`), tints material 0 cyan, materials 1 and 3 blue, material 2 near-white, and fades every material toward translucency.",
        // `ghost` takes a `direction` argument that its body never reads. It is deliberately NOT
        // exposed: a parameter published in the schema is one an editor offers and a reader
        // believes, and this one would do nothing. Expose it the day the effect starts using it.
        build: () => picture => effects.ghost(picture),
    }),
    drippy: objectLoader({
        id: "drippy",
        description: "Extends each occupied pixel up to lens[material] steps along (dx, dy) — onto empty cells, or onto a differently-coloured pixel itself backed by the same material one step further along — after first packing the picture toward the opposite edge (`fit_to`) to leave room to drip into. Only pixels whose distance-to-centre parity matches their material's parity take part, giving the drip a dithered look.",
        params: {
            dx: integer({ default: 0, description: "Horizontal step per drip pixel; 0 for a purely vertical drip." }),
            dy: integer({ default: 1, description: "Vertical step per drip pixel; 0 for a purely horizontal drip." }),
            lens: materialWeights({
                default: { 0: 2, 1: 1, 2: 1, 3: 1 },
                min: 0,
                description: "Maximum drip length, in pixels, per material index (0 disables dripping for that material).",
            }),
            only_ins: materialSet({
                default: {},
                description: "Materials restricted to dripping only onto another pixel of the same material, never into empty space.",
            }),
        },
        build: ({ dx, dy, lens, only_ins }) => picture => effects.drippy(picture, dx, dy, lens, only_ins),
    }),
    broken: objectLoader({
        id: "broken",
        description: "Shatters the picture: breaks a diagonal lattice of cells into rubble, optionally recolouring or resetting the depth of each one.",
        params: {
            strength: integer({
                default: 5,
                min: 1,
                description: 'How sparse the shattering is — a cell breaks when "(x+y) % strength === 0" and its row is not a multiple of 4.',
            }),
            // The effect's own default is `undefined` ("don't touch material"), which the kit
            // cannot express as a default (`default: undefined` means "required"); `null` behaves
            // identically here because `broken` compares with `!=`, which treats null and
            // undefined as equal.
            material: materialIndexOrNone({ default: null, description: "Material index to recolour broken cells to, or null to leave their material alone." }),
            depth: brokenDepth({
                default: -1,
                description: 'New depth for broken cells: a fixed number (the default, -1, empties them), {"offset": n} to lower the depth by that much relative to what it already was (floored at 1), or null to leave depth untouched.',
            }),
        },
        build: ({ strength, material, depth }) => picture => effects.broken(picture, strength, material, depth),
    }),
    fit_to: objectLoader({
        id: "fit_to",
        description: "Slides the whole picture along one axis until it touches the chosen edge, leaving exactly one empty row or column of margin (or does nothing if it already fits that way).",
        params: {
            axes: choice([0, 1], { default: 1, description: "Which axis to pack along: 0 for x (width), 1 for y (height)." }),
            direction: choice([1, -1], {
                default: 1,
                description: "Which edge to pack toward along axes: 1 packs toward the high-index edge (right/bottom), -1 packs toward the low-index edge (left/top).",
            }),
        },
        build: ({ axes, direction }) => picture => effects.fit_to(picture, axes, direction),
    }),
};
/** The router: "furry" is the default instance, {"id":"drippy","dy":2} is a configured one. */
export const FILTERS = registryLoader({ what: "filter", entries: FILTER_LOADERS });
/** Zero or more filters, in order. */
export const FILTER_LIST = listLoader(FILTERS, { what: "filter list" });
