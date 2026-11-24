declare name "bleeder";
declare description "a blade and a drop";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.4,weapon.blade)*.7 + p(.4,1,sfx.water.drop(800))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.758;
