/**
 * @packageDocumentation
 * The interface of the game: menus, HUD and debug tools. A retained tree of {@link Component}s, laid out by
 * {@link Container}s ({@link Box}, {@link Stack}, {@link FitBox}, {@link Scroll}, {@link Hand},
 * {@link Tilt}), in the {@link Layer}s of a {@link UiRoot}. A container may {@link Pose} its children,
 * turned and scaled. The root keeps the state of the tree (focus, scrolling, cursor), lays out what
 * changed, and draws again only the zones that changed, into a texture of its own laid on the screen each
 * frame.
 *
 * The widgets draw from a {@link Theme} of {@link NineSlice}s and a bitmap font: {@link Label},
 * {@link Paragraph}, {@link Image}, {@link Panel} and {@link Bubble} for the HUD, {@link Button},
 * {@link Slider},
 * {@link Scroll} and {@link Tabs} for the menus, {@link TextInput}, {@link NumberInput},
 * {@link ContextMenu} and {@link Tooltip} for the debug tools, {@link Choice}, {@link Parallax}
 * and {@link Transition} for the screens of a game. The root reads the actions of the `ui` table,
 * {@link UiAction}.
 */

export type { NavigationAxis } from "./Component"
export { AnimationChain, instant } from "./AnimationChain"
export type { Animation } from "./AnimationChain"
export { Component } from "./Component"
export { Container, ContentContainer } from "./Container"
export { DirtyRegion, MAX_DIRTY_RECTS } from "./DirtyRegion"
export { FrameClock } from "./FrameClock"
export { UI_BINDINGS, uiActions } from "./input/UiAction"
export type { UiAction } from "./input/UiAction"
export type { UiEvent, UiEventType } from "./input/UiEvent"
export { Layer } from "./Layer"
export { Box } from "./layout/Box"
export type { Align, BoxDirection, BoxOptions, BoxSlot } from "./layout/Box"
export { FitBox } from "./layout/FitBox"
export { Hand } from "./layout/Hand"
export type { HandOptions } from "./layout/Hand"
export type { FitMode } from "./layout/FitBox"
export { Scroll, WHEEL_STEP } from "./layout/Scroll"
export type { ScrollOptions } from "./layout/Scroll"
export { WrapBox } from "./layout/WrapBox"
export type { WrapBoxOptions } from "./layout/WrapBox"
export { Stack } from "./layout/Stack"
export type { StackSlot } from "./layout/Stack"
export { Tilt } from "./layout/Tilt"
export type { TiltLimits } from "./layout/Tilt"
export { NineSlice } from "./NineSlice"
export { Rope } from "./Rope"
export { TileRun } from "./TileRun"
export type { Tiling } from "./TileRun"
export type { Pose } from "./Pose"
export type { NineSliceMargins, NineSliceOptions } from "./NineSlice"
export { Rect } from "./Rect"
export { EMPTY_HINT, sizeHint } from "./SizeHint"
export type { Size, SizeHint } from "./SizeHint"
export type { StateLooks, Theme } from "./Theme"
export { MIN_VIRTUAL_HEIGHT, UiRoot } from "./UiRoot"
export type { UiRootOptions } from "./UiRoot"
export { Bubble } from "./widget/Bubble"
export type { BubbleOptions, BubbleTarget } from "./widget/Bubble"
export { Button } from "./widget/Button"
export type { ButtonOptions } from "./widget/Button"
export { Choice } from "./widget/Choice"
export type { ChoiceOptions, ChoiceStep } from "./widget/Choice"
export { ContextMenu } from "./widget/ContextMenu"
export type { MenuEntry, PopupAnchor } from "./widget/ContextMenu"
export { Image } from "./widget/Image"
export type { ImageOptions } from "./widget/Image"
export { Label } from "./widget/Label"
export type { LabelOptions, TextAlign } from "./widget/Label"
export { NumberInput } from "./widget/NumberInput"
export type { NumberInputOptions } from "./widget/NumberInput"
export { Panel } from "./widget/Panel"
export type { PanelOptions } from "./widget/Panel"
export { Parallax } from "./widget/Parallax"
export type { ParallaxLayer } from "./widget/Parallax"
export { Paragraph } from "./widget/Paragraph"
export type { LinkListener, ParagraphOptions } from "./widget/Paragraph"
export { Slider } from "./widget/Slider"
export type { SliderOptions } from "./widget/Slider"
export { Tabs } from "./widget/Tabs"
export type { TabPage, TabsOptions } from "./widget/Tabs"
export { CURSOR_BLINK, TextInput } from "./widget/TextInput"
export type { TextInputOptions, TextSpan } from "./widget/TextInput"
export { Tooltip, TOOLTIP_DELAY } from "./widget/Tooltip"
export { Transition } from "./widget/Transition"
export type { TransitionPlay } from "./widget/Transition"
export { readTransition } from "./widget/TransitionScript"
export type { TransitionFrame, TransitionPicture, TransitionScript } from "./widget/TransitionScript"
