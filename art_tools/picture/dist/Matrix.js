/**
 * A 2d array of values.
 */
export class Matrix {
    width;
    height;
    content;
    constructor(width, height, generator_or_array) {
        this.width = width;
        this.height = height;
        console.assert(width > 0 && height > 0);
        if (Array.isArray(generator_or_array)) {
            console.assert(generator_or_array.length == width * height);
            this.content = generator_or_array;
        }
        else {
            this.content = Array.from({ length: width * height }, (_, i) => generator_or_array(i % width, Math.floor(i / width)));
        }
    }
    /**
     * Set the value at the specified position.
     */
    set(x, y, value) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height)
            return;
        this.content[x + y * this.width] = value;
    }
    /**
     * Get the value at the specified position.
     */
    get(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height)
            return undefined;
        return this.content[x + y * this.width];
    }
    /**
     * Get a value or the default value if the position is out of bounds.
     */
    getOr(x, y, default_value) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height)
            return default_value(x, y, this);
        return this.content[x + y * this.width];
    }
    /**
     * Get the value at the specified position and loop around the matrix if the position is out of bounds.
     */
    getLooping(x, y) {
        x = (x + this.width) % this.width;
        y = (y + this.height) % this.height;
        return this.content[x + y * this.width];
    }
    /**
     * Get the value at the specified position and return the default value if the position is out of bounds.
     */
    getNearest(x, y) {
        if (x < 0)
            x = 0;
        if (x >= this.width)
            x = this.width - 1;
        if (y < 0)
            y = 0;
        if (y >= this.height)
            y = this.height - 1;
        return this.content[x + y * this.width];
    }
    /**
     * Return an iterator over the indexes of the matrix.
     */
    *indexes() { for (let x = 0; x < this.width; x++)
        for (let y = 0; y < this.height; y++)
            yield [x, y]; }
    /**
     * Check if the pixel is inside the picture.
     */
    contains(x, y) {
        return 0 <= x && x < this.width && 0 <= y && y < this.height;
    }
    /**
     * Return a new matrix with the same content.
     */
    clone() {
        return new Matrix(this.width, this.height, this.content.slice());
    }
}
