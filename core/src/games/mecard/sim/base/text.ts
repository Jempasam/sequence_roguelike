/** How many decimals a number keeps once written, so `1.5` reads as is and `0.300000004` never shows. */
const DECIMALS = 2

/** A number as the game writes it: rounded to {@link DECIMALS} decimals, no trailing zero. */
export function numberText(value: number): string {
    const scale = 10 ** DECIMALS
    return String(Math.round(value * scale) / scale)
}

/** A yes or no as the game writes it. */
export function flagText(flag: boolean): string {
    return flag ? "oui" : "non"
}
