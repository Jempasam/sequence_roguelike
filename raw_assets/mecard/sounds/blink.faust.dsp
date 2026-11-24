declare name "blink";
declare description "a soft landing after a jump: a muted thump and a short scuff";
declare duration "0.14";

import("sfx.lib");

sweeps = library("lib/sweeps.lib.dsp");

seed = hslider("seed", 1, 0, 9999, 1);

thump(t) = sweeps.sweep_sine(sfx.rand.pick(seed, 1, 110, 150), 60, 18, t);
scuff(t) = (sfx.rand.noise(seed) : fi.lowpass(2, 1800)) * sfx.env.decay(30, t) * 0.5;

process(t) = (thump(t) + scuff(t)) * 0.7;
