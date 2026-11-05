/**
 * @packageDocumentation
 * The characters met on the journey, painted flat and moved as cut-out puppets. {@link PnjPose} is the
 * pose of one, and where its parts land; {@link Pnj} draws it from the textures of its {@link PnjRig},
 * loaded from an OpenRaster painting; {@link PnjActor} brings it to life, its gaze following a point and
 * playing the {@link PnjAnimation}s; {@link PnjView} shows it in the interface, and {@link PnjScreen} is
 * the bench where it is tried.
 */

export * from "./Pnj"
export * from "./PnjActor"
export * from "./PnjAnimation"
export * from "./PnjLayout"
export * from "./PnjPose"
export * from "./PnjRig"
export * from "./PnjScreen"
export * from "./PnjView"
