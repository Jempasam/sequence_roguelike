declare name "iron_knight";
declare description "metal steps and a ring";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
metal = library("filters/metal.lib.dsp");
servo = library("../lib/halt_voices/servo.lib.dsp");

mix0(t) = (p(0,.5,weapon.clang) + p(.2,.9,servo.sound)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = metal.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.668;
