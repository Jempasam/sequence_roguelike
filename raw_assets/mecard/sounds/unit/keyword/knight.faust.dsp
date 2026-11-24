declare name "knight";
declare description "any armored unit: a clang";
declare duration "0.6";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
human = library("../lib/human.lib.dsp");
weapon = library("../lib/weapon.lib.dsp");
metal = library("../filters/metal.lib.dsp");

mix0(t) = (p(0,.6,weapon.clang) + p(.3,1,human.cry(150))*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = metal.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.684;
