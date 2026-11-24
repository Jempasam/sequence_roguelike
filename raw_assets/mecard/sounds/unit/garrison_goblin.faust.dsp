declare name "garrison_goblin";
declare description "a guard's cry and a shield knock";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
goblin = library("lib/goblin.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.7,goblin.cackle(3,320)) + p(.55,1,weapon.clang)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.977;
