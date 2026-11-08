/**
 * @packageDocumentation
 * The game, free of any environment dependency. An adapter builds a {@link Platform} and calls
 * {@link startGame} with it.
 */

export { AssetError, Assets, MemoryAssets } from "./engine/assets"
export type { AssetErrorReason, AssetPath, ImagePath, LayeredImagePath } from "./engine/assets"
export { Atlas, AtlasEntry, Packer, PagedAtlas, RenderAtlas } from "./engine/atlas"
export type {
    AtlasEntryOptions, AtlasImageItem, AtlasImageOptions, AtlasItem, AtlasOptions, AtlasRect, AtlasRegion,
    AtlasReserveItem, PackedRect, PackerOptions, PackerPage, PackerSize,
} from "./engine/atlas"
export {
    arcShape, Camera, curveSegmentsOf, Gpu, listIndices, Material, MAX_VERTICES, MITER_LIMIT, Model,
    ModelSurface, multiLineShape, MultiModel, MultiModelSurface, Painter, polygonShape, Primitive,
    RAW_VERTEX_SIZE, rectShape, RenderTexture, ScreenSurface, Shader, Shape, Sprite, STANDARD_SHADE, Texture,
    TextureSurface, thickLineShape, triangleShape,
} from "./engine/gpu"
export type {
    BlendMode, BlendState, ColorMode, DataLayout, DepthBuffer, DepthTest, GpuLimits, ModelDescription,
    PainterOptions, Placement, Point, Reach, RenderTextureOptions, ShaderSource, Surface, TargetSurface,
    UniformInfo, UniformType, UniformValue, ViewSize,
} from "./engine/gpu"
export { decodeOra, decodePng, OraError, PngError, shrinkPixels } from "./engine/image"
export type { OraErrorReason, OraImage, OraLayer, PixelData, PngErrorReason } from "./engine/image"
export {
    ActionMap, AXIS_PRESS_THRESHOLD, buttons, deviceKindOf, gamepad, InputSystem, isAxisBinding, isBinding,
    isDeviceUse, isPress, isRelease, key, KEYBOARD, keys, mouse, MOUSE, PAD_CONTROLS, pad, REPEAT_DELAY,
    REPEAT_INTERVAL, sameBinding, sameDevice, stick, STICK_DEADZONE,
} from "./engine/input"
export type {
    ActionBindings, ActionMapOptions, ActionOccurrence, ActionSample, AxisBinding, AxisValue, Binding, Device,
    DeviceKind, Direction, InputEvent, InputEventType, InputFrame, PadControl, Side,
} from "./engine/input"
export {
    command, Console, CONSOLE_KEY, CONSOLE_SECOND_KEY, ConsoleView, group, MAX_CONSOLE_LINES, named, optional, tokensOf, whole,
} from "./engine/console"
export type {
    Arg, Command, CommandContext, ConsoleLine, ConsoleLineKind, GroupParsed, LineCheck, ValuesOf,
} from "./engine/console"
export { Color, Mat4, Quat, Vec3 } from "./engine/math"
export {
    ClientSocket, DEFAULT_CAPACITY, MemoryConnection, NetError, NetSync, PeerConnection, PTPClientSocket,
    PTPHostSocket, PTPSymSocket, Room, SignalingClient,
} from "./engine/net"
export type {
    Admission, ChannelKind, Connection, ConnectionState, JoinOptions, NetErrorReason, Peer, PeerRole,
    RoomCreation, RoomEntry, RoomEvent, RoomOptions, SignalPath,
} from "./engine/net"
export { MemoryStorage, SaveError, SaveSlot } from "./engine/save"
export type { Migration, SaveErrorReason, SaveFormat } from "./engine/save"
export { BitmapFont, TextLayout } from "./engine/text"
export type { BitmapFontOptions, Glyph, GridFontOptions } from "./engine/text"
export {
    AnimationChain, Box, Bubble, Button, Choice, Component, Container, ContentContainer, ContextMenu,
    CURSOR_BLINK, DirtyRegion, EMPTY_HINT, FitBox, FrameClock, Image, instant, Label, Layer,
    MAX_DIRTY_RECTS, MIN_VIRTUAL_HEIGHT, OverflowContainer,
    NineSlice, NumberInput, Panel, Paragraph, Parallax, readTransition, Rect, Rope, Scroll, sizeHint,
    Slider, Stack, Tabs, TextInput, TileRun, Tilt, Tooltip, TOOLTIP_DELAY, Transition, UI_BINDINGS, uiActions,
    UiRoot, WHEEL_STEP, WrapBox,
} from "./engine/ui"
export type {
    Align, Animation, BoxDirection, BoxOptions, BoxSlot, BubbleOptions, BubbleTarget, ButtonOptions,
    ChoiceOptions,
    ChoiceStep, FitMode, ImageOptions, LabelOptions, MenuEntry, NavigationAxis, NineSliceMargins,
    NineSliceOptions, NumberInputOptions, OverflowContainerOptions, PanelOptions, ParagraphOptions, ParallaxLayer, PopupAnchor, Pose,
    ScrollOptions, Size, SizeHint, SliderOptions, StackSlot, StateLooks, TabPage, TabsOptions, TextAlign,
    TextInputOptions, Theme, Tiling, TiltLimits,
    TransitionFrame, TransitionPicture, TransitionPlay, TransitionScript, UiAction, UiEvent, UiEventType,
    UiRootOptions,
} from "./engine/ui"
export {
    concat, deferred, isGroup, joinText, Keyword, KeywordWord, plainText, spansOf, svgContours,
} from "./semantic"
export type {
    ColoredText, ContourPoint, LinkedText, Semantic, Stringable, SvgPath, Text, TextColor, TextDisplay,
    TextSpan,
} from "./semantic"
export { startGame } from "./game"
export { GAMEPAD_BUTTONS } from "./platform"
export type {
    AssetsPort, ClipboardPort, GamepadAxis, GamepadButton, GamepadState, GfxPort, InputPort, LoopPort,
    NetPort, Platform, PlayerStorage, RawInputEvent, StoragePort, SyncLink, SyncPeer, SyncPort, SyncRole,
    SyncRoom,
} from "./platform"
