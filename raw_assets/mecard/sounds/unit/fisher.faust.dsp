declare name "fisher";
declare description "a line cast and a plop";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.5,weapon.whoosh)*.5 + p(.5,1,sfx.water.drop(500))*.8) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.279;
