declare name "gunner";
declare description "a gunshot";
declare duration "0.4";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,1,weapon.shot)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.668;
