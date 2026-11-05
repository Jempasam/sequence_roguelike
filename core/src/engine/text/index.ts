/**
 * @packageDocumentation
 * Text in bitmap fonts, since there is neither Canvas 2D nor DOM under Node. A {@link BitmapFont} gives a
 * sprite of an atlas per character, and a {@link TextLayout} measures a text, cuts it into lines or with
 * an ellipsis, and draws it through a painter, at whole positions only. The interface, the HUD and the
 * text floating in the world all draw through it.
 *
 * A {@link TextLayout} also lays out and draws the pieces of a semantic text, from `core/src/semantic`: its
 * colored parts in their colors, its pictures as tall as a line.
 */

export * from "./BitmapFont"
export * from "./TextLayout"
