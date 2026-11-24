declare name "knight";
declare description "a cry and armor";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.6,human.cry(140)) + p(.4,1,weapon.clang)*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.912;
