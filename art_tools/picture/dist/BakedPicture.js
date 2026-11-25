import { Matrix } from "./Matrix.js";
import { lerpMaterial, Picture } from "./Picture.js";
/**
 * @typedef {import("./Picture.js").PictureMaterial&{depth:number,material_id:number,is_empty:boolean}} BakedPicturePixel
 * A matrix of whole material and depth in informations of a pictures.
 * Each pixel have its own material infos and depth.
 * Depth can have more valuer that integer between 0 and 10, instead it have a value between 0 and 1.
 */
export class BakedPicture {
    /** @type {BakedPicturePixel[]} */ pixel_colors;
    /** @type {any[]} */ temp_data;
    /**
     * @overload
     * Create a baked picture from a picture
     * @param {Picture} picture
     */
    /**
     * @overload
     * Create an empty baked picture.
     * @param {number=} width The width of the picture. 16 by default.
     * @param {number=} height The height of the picture. 16 by default.
     * @param {BakedPicturePixel[]=} pixel_colors A array of 4 colors.
     */
    /**
     * @param {number|Picture=} width_or_picture
     * @param {number=} height
     * @param {BakedPicturePixel[]=} pixel_colors
     */
    constructor(width_or_picture, height, pixel_colors) {
        if (typeof width_or_picture == "number") {
            this.width = width_or_picture ?? 16;
            this.height = height ?? 16;
            if (pixel_colors)
                console.assert(pixel_colors.length == this.width * this.height);
            this.pixel_colors = pixel_colors
                ?? Array.from({ length: this.width * this.height }, () => ({ color: [0, 0, 0], alpha: 1, light: 0, reflection: 0, depth: 0, material_id: 0, is_empty: true }));
        }
        else {
            const picture = width_or_picture;
            this.width = picture.width;
            this.height = picture.height;
            this.pixel_colors = Array.from({ length: this.width * this.height });
            for (const [x, y] of picture.indexes()) {
                const material = picture.get_material(x, y);
                const color = { ...material, color: [...material.color] };
                const index = picture.get_material_index(x, y);
                let depth = picture.get_depth(x, y);
                let is_empty = depth == -1;
                if (depth != -1)
                    depth /= 10;
                else
                    depth = 0;
                let alpha = is_empty ? 0 : color.alpha;
                this.set(x, y, { ...color, material_id: index, depth, is_empty, alpha });
            }
        }
        this.temp_data = new Array(this.width * this.height);
    }
    /**
     * Get a pixel
     * @param {number} x
     * @param {number} y
     * @returns {BakedPicturePixel}
     */
    get(x, y) { return this.pixel_colors[x + y * this.width]; }
    /**
     * Get a pixel, if the pixel is outside the picture, return an
     * empty black pixel
     * @param {number} x
     * @param {number} y
     * @returns {BakedPicturePixel}
     */
    get_overflowing(x, y) {
        if (this.contains(x, y))
            return this.get(x, y);
        else
            return { color: [0, 0, 0], alpha: 1, light: 0, reflection: 0, depth: 0, material_id: 0, is_empty: true };
    }
    /**
     * Get a pixel associated data or create it
     * @template T
     * @param {number} x
     * @param {number} y
     * @param {string} name
     * @param {()=>T} gen
     * @returns {T}
     */
    get_data_or(x, y, name, gen) {
        let data = this.temp_data[x + y * this.width] ??= {};
        if (!data[name])
            data[name] = gen();
        return data[name];
    }
    /**
     * Set a pixel color
     * @param {number} x
     * @param {number} y
     * @param {BakedPicturePixel} pixel_info
     */
    set(x, y, pixel_info) { this.pixel_colors[x + y * this.width] = pixel_info; }
    /**
     * Check if the pixel is inside the picture.
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    contains(x, y) {
        return 0 <= x && x < this.width && 0 <= y && y < this.height;
    }
    /**
     * Add shadows that depends on the light direction
     * @param {[number,number]=} light_direction
     * @param {number=} light_strength
     * @param {number=} ambient
     */
    addShadow(light_direction, light_strength = 1.5, ambient = 0.3) {
        for (let [x, y] of this.indexes()) {
            const { color, light } = this.get(x, y);
            let [nx, ny] = BakedPictureUtils.get_normal(this, x, y).map(it => it * light_strength);
            let flight = Math.min(1, (Math.max(0, ambient + nx * light_direction[0]) + Math.max(0, ambient + ny * light_direction[1])) + light);
            color[0] *= flight;
            color[1] *= flight;
            color[2] *= flight;
        }
        return this;
    }
    /**
     * Add reflections that depends on the light direction
     * @param {[number,number]=} light_direction
     * @param {number=} light_strength
     */
    addReflection(light_direction, light_strength = 1.5) {
        for (let [x, y] of this.indexes()) {
            let [lx, ly] = light_direction;
            let [nx, ny] = BakedPictureUtils.get_normal(this, x, y);
            let l = Math.sqrt(nx * nx + ny * ny) + 0.0001;
            nx /= l;
            ny /= l;
            const { color, light, reflection } = this.get(x, y);
            const flight = Math.pow(Math.max(0, nx * lx) + Math.max(0, ny * ly), 4);
            color[0] = Math.min(1, color[0] + flight * reflection);
            color[1] = Math.min(1, color[1] + flight * reflection);
            color[2] = Math.min(1, color[2] + flight * reflection);
        }
        return this;
    }
    /**
     * Add shadows that depends on the occlusion
     * @param {number=} occlusion_strength
     */
    addOcclusion(occlusion_strength = 1) {
        for (let [x, y] of this.indexes()) {
            let infos = this.get(x, y);
            let depth = infos.depth;
            let occlusion = BakedPictureUtils.get_occlusion(this, x, y) * occlusion_strength;
            let light = 1. - occlusion * (1 - infos.light);
            const color = this.get(x, y).color;
            color[0] *= light;
            color[1] *= light;
            color[2] *= light;
        }
        return this;
    }
    /**
     * Lower the contrast, so that an outline drawn afterwards is the only strong one. Each
     * material's average colour is pulled towards a common colour (`between`), and each pixel
     * towards its material's average (`shading`). Emissive pixels are left as they are.
     * @param {number=} between the share of the gap between materials kept: 1 unchanged, 0 all alike
     * @param {number=} shading the share of the shading within a material kept: 1 unchanged, 0 flat
     * @param {number[]|null=} towards the common colour [r,g,b] in 0..1; the picture's average when absent
     */
    reduceContrast(between = 0.5, shading = 1, towards = null) {
        /** @type {Map<number, number[]>} */ const sums = new Map();
        for (let [x, y] of this.indexes()) {
            const infos = this.get(x, y);
            if (infos.is_empty)
                continue;
            const sum = sums.get(infos.material_id) ?? [0, 0, 0, 0];
            sum[0] += infos.color[0];
            sum[1] += infos.color[1];
            sum[2] += infos.color[2];
            sum[3]++;
            sums.set(infos.material_id, sum);
        }
        let common = towards;
        if (!common) {
            const total = [0, 0, 0, 0];
            for (const sum of sums.values())
                for (let c = 0; c < 4; c++)
                    total[c] += sum[c];
            common = total[3] ? [total[0] / total[3], total[1] / total[3], total[2] / total[3]] : [0, 0, 0];
        }
        for (let [x, y] of this.indexes()) {
            const infos = this.get(x, y);
            if (infos.is_empty || infos.light > 0)
                continue;
            const sum = /** @type {number[]} */ (sums.get(infos.material_id));
            for (let c = 0; c < 3; c++) {
                const mean = sum[c] / sum[3];
                const target = common[c] + (mean - common[c]) * between;
                infos.color[c] = target + (infos.color[c] - mean) * shading;
            }
        }
        return this;
    }
    /**
     * Tint the whole picture, as a coloured filter: every drawn pixel blended towards a colour.
     * @param {number[]} tint the colour [r,g,b] in 0..1
     * @param {number=} amount how far towards it: 0 nothing, 1 all that colour
     */
    tinted(tint, amount = 0.1) {
        for (let [x, y] of this.indexes()) {
            const infos = this.get(x, y);
            if (infos.is_empty && !(infos.alpha > 0))
                continue;
            for (let c = 0; c < 3; c++)
                infos.color[c] += (tint[c] - infos.color[c]) * amount;
        }
        return this;
    }
    /**
     * Change the alpha value depending on the depth to emulate a thickness
     */
    addAlphaThickness() {
        for (let [x, y] of this.indexes()) {
            let infos = this.get(x, y);
            let depth = infos.depth;
            let alpha = infos.alpha;
            let alpha2 = Math.pow(alpha, 4);
            let alpha3 = Math.sqrt(alpha);
            infos.alpha = alpha2 * (1 - depth) + alpha3 * depth;
        }
        return this;
    }
    /**
     * Add a gloom effect around lighting materials
     */
    addGloom(strength = 0.5) {
        const read = this.clone();
        for (let [x, y] of this.indexes()) {
            const infos = read.get(x, y);
            if (infos.is_empty || infos.light <= 0)
                continue;
            for (let dx of [-1, 0, 1])
                for (let dy of [-1, 0, 1]) {
                    if (dx == 0 && dy == 0)
                        continue;
                    if (!this.contains(x + dx, y + dy))
                        continue;
                    const binfos = this.get(x + dx, y + dy);
                    const fstrength = strength / (Math.abs(dx) + Math.abs(dy)) * infos.alpha * infos.light;
                    if (fstrength > 0.001) {
                        if (!binfos.is_empty) {
                            // @ts-ignore
                            binfos.color = binfos.color.map((c, i) => Math.min(1, c + fstrength * infos.color[i]));
                            binfos.alpha = Math.min(1, binfos.alpha + fstrength / 2);
                        }
                        else {
                            binfos.is_empty = false;
                            // @ts-ignore
                            binfos.color = infos.color.map((c, i) => Math.min(1, c + fstrength / 2));
                            binfos.alpha = Math.min(1, fstrength * 2);
                            binfos.light = 1;
                            binfos.material_id = 63267;
                            binfos.depth = 0;
                        }
                    }
                }
        }
        return this;
    }
    /**
     * Add inner outlines
     * @param {number=} darkness
     * @param {boolean=} different_mat Is the outline mat different of the pixel it take its color from
     */
    addInnerOutline(darkness = 0.3, different_mat = false) {
        for (let [x, y] of this.indexes()) {
            const infos = this.get(x, y);
            if (infos.is_empty && (x != 0 && y != 0 && x != this.width - 1 && y != this.height - 1))
                continue;
            for (let [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                if (!this.contains(x + dx, y + dy))
                    continue;
                const binfos = this.get(x + dx, y + dy);
                if (!binfos.is_empty)
                    continue;
                infos.color[0] *= darkness;
                infos.color[1] *= darkness;
                infos.color[2] *= darkness;
                if (different_mat)
                    infos.material_id = 4524;
                break;
            }
        }
        return this;
    }
    /**
     * Add outer outlines
     * @param {number=} darkness
     * @param {boolean=} different_mat Is the outline mat different of the pixel it take its color from
     */
    addOuterOutline(darkness = 0.3, different_mat = false) {
        // Get the color counts
        const colors = new Matrix(this.width, this.height, (x, y) => {
            const color = [0, 0, 0];
            let count = 0;
            for (let dx = -2; dx <= 2; dx++)
                for (let dy = -2; dy <= 2; dy++) {
                    const xx = x + dx;
                    const yy = y + dy;
                    if (this.contains(xx, yy)) {
                        const around = this.get(xx, yy);
                        if (around.is_empty)
                            continue;
                        for (let i = 0; i < 3; i++)
                            color[i] += around.color[i];
                        count++;
                    }
                }
            for (let i = 0; i < 3; i++)
                color[i] /= count;
            return color;
        });
        // Create the outline
        const read = this.clone();
        for (let [x, y] of this.indexes()) {
            const infos = this.get(x, y);
            if (!infos.is_empty && (x != 0 && y != 0 && x != this.width - 1 && y != this.height - 1))
                continue;
            for (let [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                if (!this.contains(x + dx, y + dy))
                    continue;
                let binfos = read.get(x + dx, y + dy);
                if (binfos.is_empty)
                    continue;
                let color = colors.get(x + dx, y + dy);
                binfos = copyPixel(binfos);
                //@ts-ignore
                binfos.color = color.map(v => v * darkness);
                if (different_mat)
                    binfos.material_id = 4524;
                this.set(x, y, binfos);
                break;
            }
        }
        return this;
    }
    /**
     * Change the color of the picture to be a depthmap
     */
    makeDepthmap() {
        for (let [x, y] of this.indexes()) {
            let depth = this.get(x, y).depth;
            this.get(x, y).color = [depth, depth, depth];
        }
        return this;
    }
    /**
     * Add casted shadows
     * @param {[number,number]=} light_direction
     */
    addCastedShadow(light_direction) {
        let dx = light_direction[0] * 4;
        let dy = light_direction[1] * 4;
        if (dx > 1)
            dx = -1;
        else if (dx < -1)
            dx = 1;
        else
            dx = 0;
        if (dy > 1)
            dy = -1;
        else if (dy < -1)
            dy = 1;
        else
            dy = 0;
        for (let [x, y] of this.indexes()) {
            const infos = this.get(x, y);
            if (!infos.is_empty)
                continue;
            if (!this.contains(x + dx, y + dy))
                continue;
            const other_infos = this.get(x + dx, y + dy);
            if (!other_infos.is_empty) {
                let alpha = other_infos.alpha / 3 * (1 - other_infos.light);
                if (x == 1 || y == 1 || x == this.width - 2 || y == this.height - 2)
                    alpha /= 2;
                if (x == 0 || y == 0 || x == this.width - 1 || y == this.height - 1)
                    alpha /= 2;
                this.set(x, y, { color: [0, 0, 0], alpha, is_empty: false, depth: 0, light: 0, material_id: 423585, reflection: 0 });
            }
        }
        return this;
    }
    /**
     * Create a smooth version of the picture
     */
    smoothed() {
        const ret = new BakedPicture(this.width * 3, this.height * 3);
        for (const [x, y] of this.indexes()) {
            const infos = this.get(x, y);
            const { color, depth, material_id, is_empty, alpha } = infos;
            // Center color
            for (let xx = 0; xx < 3; xx++)
                for (let yy = 0; yy < 3; yy++)
                    ret.set(x * 3 + xx, y * 3 + yy, copyPixel(infos));
            // Corner Colors
            for (const dx of [-1, 1]) {
                for (const dy of [-1, 1]) {
                    const b = this.get_overflowing(x, y + dy);
                    const c = this.get_overflowing(x + dx, y);
                    if (b.material_id == c.material_id && !b.is_empty && !c.is_empty) {
                        let final_mat;
                        let final_depth;
                        if (!is_empty)
                            [final_mat, final_depth] = [
                                lerpMaterial(b, lerpMaterial(infos, c, 0.5), 0.6),
                                (depth + b.depth + c.depth) / 3
                            ];
                        else
                            [final_mat, final_depth] = [
                                lerpMaterial(b, c, 0.5),
                                (b.depth + c.depth) / 2
                            ];
                        let target = ret.get(x * 3 + 1 + dx, y * 3 + 1 + dy);
                        ret.set(x * 3 + 1 + dx, y * 3 + 1 + dy, { ...target, ...final_mat, depth: final_depth });
                    }
                    else if (b.is_empty && c.is_empty) {
                        let target = ret.get(x * 3 + 1 + dx, y * 3 + 1 + dy);
                        target.is_empty = true;
                        target.alpha = 0;
                    }
                }
            }
        }
        return ret;
    }
    /**
     * Render to straight (non-premultiplied) RGBA bytes, one texel per pixel, row-major from the
     * top-left. This is the headless twin of `draw`: same pixels, no `CanvasRenderingContext2D`,
     * so the whole pipeline runs under Node and its output can be uploaded to a GPU as-is.
     * @returns {{width:number, height:number, rgba:Uint8Array}}
     */
    toPixels() {
        const rgba = new Uint8Array(this.width * this.height * 4);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const { color, alpha } = this.get(x, y);
                const o = (x + y * this.width) * 4;
                rgba[o + 0] = clamp255(color[0] * 255);
                rgba[o + 1] = clamp255(color[1] * 255);
                rgba[o + 2] = clamp255(color[2] * 255);
                rgba[o + 3] = clamp255(alpha * 255);
            }
        }
        return { width: this.width, height: this.height, rgba };
    }
    /**
     * Draw the picture on the context.
     * @param {CanvasRenderingContext2D} context
     */
    draw(context) {
        context.save();
        context.scale(1 / this.width, 1 / this.height);
        for (let [x, y] of this.indexes()) {
            let { color, alpha, is_empty } = this.get(x, y);
            if (alpha < 0.001)
                continue;
            context.fillStyle = `rgba(${Math.floor(color[0] * 255)},${Math.floor(color[1] * 255)},${Math.floor(color[2] * 255)},${alpha})`;
            context.fillRect(x, y, 1.05, 1.05);
        }
        context.restore();
    }
    *indexes() { for (let x = 0; x < this.width; x++)
        for (let y = 0; y < this.height; y++)
            yield [x, y]; }
    clone() {
        return new BakedPicture(this.width, this.height, this.pixel_colors.map(copyPixel));
    }
}
/**
 * A copy of a pixel: its colour is the only nested value, and the effects change it in place.
 * @param {BakedPicturePixel} pixel
 * @returns {BakedPicturePixel}
 */
function copyPixel(pixel) {
    return { ...pixel, color: [...pixel.color] };
}
/**
 * Floats coming out of the effect pipeline are not guaranteed to stay in [0,1] — clamp on the way
 * to bytes rather than letting a value wrap around.
 * @param {number} value
 */
function clamp255(value) {
    return Math.max(0, Math.min(255, Math.floor(value)));
}
export const BakedPictureUtils = {
    /**
     * Get the normal of a pixel of a picture.
     * @param {BakedPicture} picture
     * @param {number} x
     * @param {number} y
     */
    get_normal(picture, x, y) {
        return picture.get_data_or(x, y, "normal", () => {
            let depth = picture.get(x, y).depth;
            let normal_x = 0;
            let normal_y = 0;
            if (x == 0)
                normal_x = depth - picture.get(x + 1, y).depth;
            else if (x == picture.width - 1)
                normal_x = picture.get(x - 1, y).depth - depth;
            else
                normal_x = (depth - picture.get(x - 1, y).depth) + (picture.get(x + 1, y).depth - depth) / 2;
            if (y == 0)
                normal_y = depth - picture.get(x, y + 1).depth;
            else if (y == picture.height - 1)
                normal_y = picture.get(x, y - 1).depth - depth;
            else
                normal_y = (depth - picture.get(x, y - 1).depth) + (picture.get(x, y + 1).depth - depth) / 2;
            return [normal_x, normal_y];
        });
    },
    /**
     * Get the occlusion factor of a pixel of a picture.
     * @param {BakedPicture} picture
     * @param {number} x
     * @param {number} y
     */
    get_occlusion(picture, x, y) {
        return picture.get_data_or(x, y, "occlusion", () => {
            let depth = picture.get(x, y).depth;
            let occlusion = 0;
            if (x != 0 && x != picture.width - 1)
                occlusion += (picture.get(x + 1, y).depth - depth) - (depth - picture.get(x - 1, y).depth);
            if (y != 0 && y != picture.height - 1)
                occlusion += (picture.get(x, y + 1).depth - depth) - (depth - picture.get(x, y - 1).depth);
            return Math.max(0, occlusion);
        });
    },
    /**
     * Get the color in css format
     * @param {[number,number,number,number]} color
     */
    get_css_color(color) {
        return `rgba(${Math.floor(color[0] * 255)},${Math.floor(color[1] * 255)},${Math.floor(color[2] * 255)},${color[3]})`;
    }
};
