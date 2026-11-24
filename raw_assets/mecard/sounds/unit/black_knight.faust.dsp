declare name "black_knight";
declare description "armor and a hollow voice";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
undead = library("lib/undead.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
metal = library("filters/metal.lib.dsp");

mix0(t) = (p(0,.9,undead.hollow(130)) + p(.5,1,weapon.clang)*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = metal.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 1.096;
