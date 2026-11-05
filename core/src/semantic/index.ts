/**
 * @packageDocumentation
 * The semantic text, shared by every layer since it depends on none: a {@link Text} says what it is about
 * (strings, the objects and the {@link Keyword}s it names, colored parts, groups) and leaves how it looks to
 * whoever shows it. The objects of a game tell themselves through {@link Semantic.toSemString}.
 * {@link spansOf} reads a text into pieces to lay out, {@link plainText} into a string, and
 * {@link svgContours} reads the pictures a reader puts in it.
 */

export * from "./Keyword"
export * from "./svgContours"
export * from "./Text"
