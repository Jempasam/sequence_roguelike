/**
 * A 2d array of values.
 */
export declare class Matrix<T> {
    readonly width: number;
    readonly height: number;
    private content;
    constructor(width: number, height: number, generator_or_array: ((x: number, y: number) => T) | T[]);
    /**
     * Set the value at the specified position.
     */
    set(x: number, y: number, value: T): void;
    /**
     * Get the value at the specified position.
     */
    get(x: number, y: number): T | undefined;
    /**
     * Get a value or the default value if the position is out of bounds.
     */
    getOr(x: number, y: number, default_value: (x: number, y: number, matrix: Matrix<T>) => T): T;
    /**
     * Get the value at the specified position and loop around the matrix if the position is out of bounds.
     */
    getLooping(x: number, y: number): T;
    /**
     * Get the value at the specified position and return the default value if the position is out of bounds.
     */
    getNearest(x: number, y: number): T;
    /**
     * Return an iterator over the indexes of the matrix.
     */
    indexes(): Generator<number[], void, unknown>;
    /**
     * Check if the pixel is inside the picture.
     */
    contains(x: number, y: number): boolean;
    /**
     * Return a new matrix with the same content.
     */
    clone(): Matrix<T>;
}
