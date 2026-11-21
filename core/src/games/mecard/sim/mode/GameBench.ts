/** What a game of any mode asks of the screen, which it knows nothing of. */
export interface GameBench {
    /** Tell the player something went wrong, which does not stop the game. */
    report(text: string): void
}
