declare name "hit_heavy";
declare description "a crushing blow: a deep boom with a cracking slap";
declare duration "0.5";

import("sfx.lib");

boom(t) = sfx.osc.sine(sfx.env.sweep(95, 32, t)) * sfx.env.decay(8, t);
crack(t) = (no.noise : fi.lowpass(2, 4200)) * sfx.env.decay(30, t) * 0.8;
rubble(t) = (no.noises(2, 1) : fi.lowpass(2, 700)) * sfx.env.decay(9, t) * 0.5;

process(t) = (boom(t) + crack(t) + rubble(t)) : sfx.fx.drive(2.2) : sfx.fx.dcblock : *(0.55);
