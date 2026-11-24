declare name "shield_guard";
declare description "a shield knock";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
metal = library("filters/metal.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.6,weapon.clang) + p(0,.5,thud.sound)*.7) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = metal.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.661;
