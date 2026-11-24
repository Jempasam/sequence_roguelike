import { Picture } from "./Picture.js";
import { Matrix } from "./Matrix.js";
/** @type { {[name:string]:function(Picture,...any|undefined):Picture} } */
const effects = {
    normal(it) { return it; },
    burning(input) {
        let output = effects.broken(input, 5, 2, 0);
        for (let i of [0, 1]) //@ts-ignore
            output.materials[i].color = output.materials[i].color.map(v => v / 8 + 0.2);
        output.materials[2].color = [1, .5, 0];
        output.materials[2].light = 0.3;
        return output;
    },
    burned(input) {
        let output = effects.broken(input);
        for (let i of [0, 3]) {
            //@ts-ignore
            output.materials[i].color = output.materials[i].color.map(v => v / 8 + 0.2);
        }
        return output;
    },
    fiery(input) {
        let output = effects.drippy(input, 0, -1, { 0: 2, 1: 1, 2: 2 }, { 1: true });
        output.materials[0].color = lerp_colors(input.materials[0].color, [1, 0.3, 0], 0.6);
        output.materials[0].light = lerp(input.materials[0].light, 0.6, 0.3);
        // @ts-ignore
        output.materials[1].color = output.materials[1].color.map(v => v / 4);
        output.materials[2].color = lerp_colors(input.materials[2].color, [1, 1, 0], 0.8);
        output.materials[2].light = lerp(input.materials[2].light, 0.8, 0.4);
        //@ts-ignore
        output.materials[3].color = output.materials[0].color.map(v => v * 0.7);
        output.materials[3].light = 0;
        for (const [x, y] of output.indexes()) {
            if (y - 2 + x % 2 + (x + 1) % 3 * 2 > input.height / 2 && output.get_depth(x, y) != -1 && output.get_material_index(x, y) == 0)
                output.set_material_index(x, y, 3);
        }
        return output;
    },
    furry(input) {
        let output = effects.excroissances(input, [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], { 0: true, 3: true });
        output.materials[0].color = lerp_colors(input.materials[0].color, [0.5, 0.35, 0.2], 0.9);
        output.materials[0].reflection = lerp(input.materials[0].reflection, 0., 0.5);
        output.materials[0].alpha = lerp(input.materials[0].alpha, 1., 0.5);
        return output;
    },
    /**
     * @param {Picture} input
     * @param {[number,number][]} directions
     * @param {{[key:number]:true|undefined}} materials
     */
    excroissances(input, directions = [[1, 0], [-1, 0], [0, 1], [0, -1]], materials = { 0: true, 1: true, 2: true, 3: true }) {
        let mask = new Matrix(input.width, input.height, () => false);
        let output = input.clone();
        for (let [x, y] of output.indexes()) {
            if (mask.get(x, y))
                continue;
            const depth = input.get_depth(x, y);
            for (const [dx, dy] of directions) {
                const px = Math.min(input.width - x - 1, x) + 1;
                const py = Math.min(input.height - y - 1, y) + 1;
                const wall = input.depths.get(x - dx, y - dy) ?? -1;
                const reverse = input.depths.get(x + dx, y + dy) ?? -1;
                const rev1 = input.depths.get(x + dx, y) ?? -1;
                const rev2 = input.depths.get(x, y + dy) ?? -1;
                const top = input.depths.get(x + dy, y + dx) ?? -1;
                const down = input.depths.get(x - dy, y - dx) ?? -1;
                if (!(wall != -1 && reverse == -1 && top == -1 && down == -1 && rev1 == -1 && rev2 == -1))
                    continue;
                const mat_info = materials[input.get_material_index(x - dx, y - dy)];
                if (!mat_info)
                    continue;
                output.set_depth(x, y, wall);
                output.set_depth(x - dx, y - dy, wall + 1);
                output.set_material_index(x, y, input.get_material_index(x - dx, y - dy));
                for (let xx of [x - 1, x, x + 1])
                    for (let yy of [y - 1, y, y + 1])
                        if (mask.contains(xx, yy))
                            mask.set(xx, yy, true);
            }
        }
        return output;
    },
    ghost(input, direction = 1) {
        let output = effects.drippy(input, 0, 1, { 1: 2, 2: 2, 3: 2 });
        output.materials[0].color = lerp_colors(input.materials[0].color, [0.0, 1.0, 1.0], 0.4);
        output.materials[1].color = lerp_colors(input.materials[1].color, [0.0, 0.7, 1.0], 0.2);
        output.materials[2].color = lerp_colors(input.materials[2].color, [1.0, 1.0, 1.0], 0.5);
        output.materials[3].color = lerp_colors(input.materials[3].color, [0.0, 0.7, 1.0], 0.2);
        output.materials[0].alpha = lerp(input.materials[0].alpha, 0.5, 0.3);
        output.materials[1].alpha = lerp(input.materials[0].alpha, 0.5, 0.2);
        output.materials[2].alpha = lerp(input.materials[0].alpha, 0.5, 0.1);
        output.materials[3].alpha = lerp(input.materials[0].alpha, 0.5, 0.1);
        return output;
    },
    auto_depth(input) {
        let output = effects.thickness_depth(input);
        // The pixel between at least three pixel of at least the same depth around and no pixel of two depth under, are upped
        // two times
        for (let i = 0; i < 2; i++) {
            const result = output.clone();
            for (let [x, y] of output.indexes()) {
                if (output.get_depth(x, y) != -1) {
                    let count = 0;
                    for (let [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                        const [xx, yy] = /** @type {[number,number]} */ ([x + dx, y + dy]);
                        if (output.contains(xx, yy)) {
                            if (output.get_depth(xx, yy) >= output.get_depth(x, y))
                                count++;
                            else if (output.get_depth(xx, yy) < output.get_depth(x, y) - 1 || output.get_depth(xx, yy) == -1)
                                count = -1000;
                        }
                    }
                    if (count >= 3)
                        result.set_depth(x, y, output.get_depth(x, y) + 1);
                }
            }
            output = result;
        }
        // Secondary colors upped
        for (let [x, y] of output.indexes()) {
            if (output.get_material_index(x, y) != 0 && output.get_depth(x, y) != -1) {
                output.set_depth(x, y, output.get_depth(x, y) + 1);
            }
        }
        return output;
    },
    thickness_depth(input) {
        let is_changed = new Matrix(input.width, input.height, () => true);
        let output = input.clone();
        // Set no depth
        for (let [x, y] of input.indexes()) {
            if (input.get_depth(x, y) != -1)
                is_changed.set(x, y, false);
        }
        // Fill
        let remaining = false;
        do {
            remaining = false;
            const new_is_changed = is_changed.clone();
            for (let [x, y] of output.indexes()) {
                if (is_changed.get(x, y))
                    continue;
                let max = -2;
                for (let [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                    const [xx, yy] = /** @type {[Number,number]} */ ([x + dx, y + dy]);
                    if (!output.contains(xx, yy) || !is_changed.get(xx, yy))
                        continue;
                    max = Math.max(max, output.get_depth(xx, yy));
                }
                if (max > -2) {
                    new_is_changed.set(x, y, true);
                    output.set_depth(x, y, max + 1);
                }
                else
                    remaining = true;
            }
            is_changed = new_is_changed;
        } while (remaining);
        return output;
    },
    drippy(input, dx = 0, dy = 1, lens = { 0: 2, 1: 1, 2: 1, 3: 1 }, only_ins = {}) {
        if (dx != 0)
            input = effects.fit_to(input, 0, -Math.sign(dx));
        if (dy != 0)
            input = effects.fit_to(input, 1, -Math.sign(dy));
        const output = input.clone();
        for (const [x, y] of input.indexes()) {
            const depth = input.get_depth(x, y);
            const material = input.get_material_index(x, y);
            if (depth == -1)
                continue;
            let distance_to_center = Math.max(Math.abs(Math.floor(input.width / 2) - x), Math.abs(Math.ceil(input.width / 2) - 1 - x));
            if (distance_to_center % 2 != material % 2)
                continue;
            const len = lens[material] ?? 0;
            const only_in = only_ins[material] ?? false;
            for (let l = 1; l <= len; l++) {
                let xx = x + dx * l, yy = y + dy * l;
                if (input.contains(xx, yy)
                    && ((input.get_material_index(xx, yy) != material && (input.contains(xx + dx, yy + dy) && input.get_material_index(xx + dx, yy + dy) == input.get_material_index(xx, yy) && input.get_depth(xx + dx, yy + dy) != -1)) // Drip on material
                        || (input.get_depth(xx, yy) == -1 && !only_in) // Drip on empty
                    )) {
                    output.set_depth(xx, yy, depth);
                    output.set_material_index(xx, yy, input.get_material_index(x, y));
                }
                else
                    break;
            }
        }
        return output;
    },
    look_right(it, dx = -1, dy = 0) {
        const ret = it.clone();
        // Get max
        let max = 0;
        for (let [x, y] of ret.indexes()) {
            const depth = ret.get_depth(x, y);
            if (depth == -1)
                continue;
            max = Math.max(max, depth);
        }
        // Move
        let [xmin, xmax, xi] = dx >= 0 ? [0, ret.width - dx, 1] : [ret.width + dx, 0, -1];
        let [ymin, ymax, yi] = dy >= 0 ? [0, ret.height - dy, 1] : [ret.height + dy, 0, -1];
        for (let x = xmin; x != xmax; x += xi) {
            for (let y = ymin; y != ymax; y += yi) {
                const depth = ret.get_depth(x + dx, y + dy);
                if (depth <= Math.floor(max / 2))
                    continue;
                ret.set_depth(x, y, depth);
                ret.set_material_index(x, y, ret.get_material_index(x + dx, y + dy));
                if (x + dx < ret.width - 1 && y + dy < ret.width - 1) {
                    ret.set_depth(x + dx, y + dy, ret.get_depth(x + dx * 2, y + dy * 2));
                    ret.set_material_index(x + dx, y + dy, ret.get_material_index(x + dx * 2, y + dy * 2));
                }
                else {
                    ret.set_depth(x + dx, y + dy, -1);
                }
            }
        }
        return ret;
    },
    look_left(it) { return effects.look_right(it, 1, 0); },
    look_up(it) { return effects.look_right(it, 0, 1); },
    look_down(it) { return effects.look_right(it, 0, -1); },
    sayan(it) {
        let ret = it.clone();
        ret.materials[0].color[0] = 1.0;
        ret.materials[0].color[1] = 0.8;
        ret.materials[0].color[2] = 0.0;
        ret.materials[0].light += 0.2;
        ret.materials[2].color[0] = 0.0;
        ret.materials[2].color[1] = 0.0;
        ret.materials[2].color[2] = 1.0;
        ret.materials[2].light += 0.4;
        ret = effects.drippy(ret, 0, -1, { 0: 2, 1: 1, 2: 1 }, { 1: true });
        return ret;
    },
    slimy(it) {
        let ret = it.clone();
        ret.materials[0].color = lerp_colors(it.materials[0].color, [0.2, 1.0, 0.2], 0.5);
        ret.materials[0].alpha = lerp(it.materials[0].alpha, 0.8, 0.4);
        ret.materials[0].reflection = lerp(it.materials[1].reflection, 0.5, 0.4);
        ret.materials[1].color = lerp_colors(it.materials[1].color, [0.2, 1.0, 0.2], 0.3);
        ret.materials[1].reflection = lerp(it.materials[1].reflection, 0.5, 0.3);
        ret.materials[2].color = lerp_colors(it.materials[2].color, [0.2, 1.0, 0.2], 0.2);
        ret.materials[2].reflection = lerp(it.materials[2].reflection, 0.5, 0.2);
        ret.materials[3].color = lerp_colors(it.materials[3].color, [0.2, 1.0, 0.2], 0.2);
        ret.materials[3].reflection = lerp(it.materials[3].reflection, 0.5, 0.1);
        ret = effects.drippy(ret, 0, 1, { 0: 2, 1: 1, 2: 1, 3: 1 });
        return ret;
    },
    /**
     *
     * @param {Picture} picture
     * @param {number} strength
     * @param {1|2|3|4|undefined} material
     * @param {number|{offset:number}|undefined} depth
     * @returns
     */
    broken(picture, strength = 5, material = undefined, depth = -1) {
        const ret = picture.clone();
        for (let [x, y] of ret.indexes()) {
            const d = ret.get_depth(x, y);
            if ((x + y) % strength == 0 && y % 4 != 0 && d != -1) {
                let fdepth;
                if (depth == undefined)
                    fdepth = undefined;
                else if (typeof depth == "object")
                    fdepth = Math.max(1, d - depth.offset);
                else
                    fdepth = depth;
                if (fdepth != undefined)
                    ret.set_depth(x, y, fdepth);
                if (material != undefined)
                    ret.set_material_index(x, y, material);
            }
        }
        return ret;
    },
    zombie(picture) {
        const ret = effects.broken(picture);
        ret.materials[0].color[1] = Math.min(1.0, picture.materials[0].color[1] + 0.3);
        ret.materials[0].color[0] = Math.max(0.0, picture.materials[0].color[0] - 0.3);
        ret.materials[0].color[2] = Math.max(0.0, picture.materials[0].color[2] - 0.3);
        ret.materials[1].color[0] = Math.min(1.0, picture.materials[1].color[0] + 0.3);
        ret.materials[1].color[1] = Math.max(0.0, picture.materials[1].color[1] - 0.3);
        ret.materials[1].color[2] = Math.max(0.0, picture.materials[1].color[2] - 0.3);
        return ret;
    },
    drug(picture) {
        const ret = picture.clone();
        for (let [x, y] of picture.indexes()) {
            const color = picture.get_material_index(x, y);
            const depth = picture.get_depth(x, y);
            if (depth == -1 || (color != 1 && color != 2))
                continue;
            ret.set_depth(x, y, Math.min(10, depth + 1));
            for (let [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                if (!picture.contains(x + dx, y + dy))
                    continue;
                const old_color = picture.get_material_index(x + dx, y + dy);
                if (old_color == 1 || old_color == 2)
                    continue;
                ret.set_material_index(x + dx, y + dy, color);
                ret.set_depth(x + dx, y + dy, depth);
                if (picture.contains(x + dx * 2, y + dy * 2) && picture.get_depth(x + dx * 2, y + dy * 2) == -1) {
                    ret.set_material_index(x + dx * 2, y + dy * 2, picture.get_material_index(x + dx, y + dy));
                    ret.set_depth(x + dx * 2, y + dy * 2, picture.get_depth(x + dx, y + dy));
                }
            }
        }
        return ret;
    },
    weird(picture) {
        const ret = picture.clone();
        for (let y = 0; y < ret.height; y++) {
            const direction = y % 2;
            for (let x = 0; x < ret.width - direction; x++) {
                ret.set_depth(x, y, picture.get_depth(x + direction, y));
                ret.set_material_index(x, y, picture.get_material_index(x + direction, y));
            }
        }
        ret.materials[0].color[0] = Math.min(1.0, picture.materials[0].color[0] + 0.2);
        ret.materials[0].color[1] = Math.max(0.0, picture.materials[0].color[1] - 0.2);
        ret.materials[0].color[2] = Math.min(1.0, picture.materials[0].color[2] + 0.3);
        ret.materials[2].color[0] = Math.min(1.0, picture.materials[2].color[0] + 0.3);
        ret.materials[2].color[1] = Math.max(.0, picture.materials[2].color[1] - 0.3);
        ret.materials[2].color[2] = Math.max(.0, picture.materials[2].color[2] - 0.3);
        return ret;
    },
    thin(picture) {
        const ret = picture.clone();
        for (let [x, y] of picture.indexes()) {
            if (ret.get_depth(x, y) != -1)
                ret.set_depth(x, y, Math.max(-1, picture.get_depth(x, y) - 1));
        }
        return ret;
    },
    fato(picture) {
        const ret = picture.clone();
        for (let [x, y] of picture.indexes()) {
            if (ret.get_depth(x, y) != -1)
                ret.set_depth(x, y, Math.min(10, picture.get_depth(x, y) + 1));
        }
        pixel_loop: for (let [x, y] of picture.indexes()) {
            const depth = picture.get_depth(x, y);
            if (depth != -1)
                continue;
            dirloop: for (let [dx, dy] of [-1, 0, 1].flatMap(x => [-1, 0, 1].map(y => [x, y]))) {
                if (dx == 0 && dy == 0)
                    continue;
                for (let i = 1; i <= 4; i++) {
                    if (!picture.contains(x + dx * i, y + dy * i) || picture.get_depth(x + dx * i, y + dy * i) == -1) {
                        continue dirloop;
                    }
                }
                ret.set_depth(x, y, Math.max(0, picture.get_depth(x + dx, y + dy) - 1));
                ret.set_material_index(x, y, picture.get_material_index(x + dx, y + dy));
                continue pixel_loop;
            }
        }
        return ret;
    },
    /**
     * Move all the pixel to to make, the picture, close fit a side if possible by keepeing a space of at least one pixel.
     **/
    fit_to(input, axes = 1, direction = 1) {
        direction = -direction;
        const output = input.clone();
        let dims = [input.width, input.height];
        let axes2 = (axes + 1) % 2;
        let len = 0;
        // Get the amount of movement possible
        let maxi = direction == 1 ? dims[axes] - 1 : -1;
        let mini = direction == 1 ? 0 : dims[axes] - 1;
        let diri = direction == 1 ? 1 : -1;
        loop: for (let i = mini; i != maxi; i += diri) {
            for (let j = 0; j < dims[axes2]; j++) {
                let coords = /** @type {[number,number]} */ ([0, 0]);
                coords[axes] = i;
                coords[axes2] = j;
                if (input.get_depth(...coords) != -1)
                    break loop;
            }
            len++;
        }
        // At least one empty space before border
        len--;
        // Move the pixels
        for (let i = 0; i < dims[axes]; i++) {
            for (let j = 0; j < dims[axes2]; j++) {
                let output_coords = /** @type {[number,number]} */ ([0, 0]);
                let input_coords = /** @type {[Number,number]} */ ([0, 0]);
                output_coords[axes] = i;
                output_coords[axes2] = j;
                input_coords[axes] = i + len * direction;
                input_coords[axes2] = j;
                if (input.contains(...input_coords)) {
                    output.set_depth(...output_coords, input.get_depth(...input_coords));
                    output.set_material_index(...output_coords, input.get_material_index(...input_coords));
                }
                else {
                    output.set_depth(...output_coords, -1);
                }
            }
        }
        return output;
    },
};
/**
 * Linear interpolation between two arrays.
 * @param {Array<number>} a
 * @param {Array<number>} b
 * @param {number} t
 * @returns {Array<number>}
 */
function lerp_arrays(a, b, t) {
    return a.map((v, i) => v * (1 - t) + b[i] * t);
}
/**
 * Linear interpolation between two colors.
 * @param {[number,number,number]} a
 * @param {[number,number,number]} b
 * @param {number} t
 * @returns {[number,number,number]}
 */
function lerp_colors(a, b, t) {
    return /** @type {[number,number,number]} */ (lerp_arrays(a, b, t));
}
/**
 * Linear interpolation between two values.
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
function lerp(a, b, t) {
    return a * (1 - t) + b * t;
}
export default effects;
