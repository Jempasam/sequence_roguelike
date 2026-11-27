declare name "stunned";
declare description "a dull knock, then dizzy chirps circling and fading";
declare duration "0.7";

import("sfx.lib");

pitch = 1600 * (1 + 0.18 * os.osc(5)) * (1 + 0.04 * os.osc(17));
chirps(t) = sfx.osc.sine(pitch) * abs(os.osc(6)) * sfx.env.fadeio(0.15, 0.5, t) * 0.4;

process(t) = sfx.perc.thud(min(t / 0.35, 1)) * (t < 0.35) * 0.5 + chirps(t);
