declare name "spellblade";
declare description "a blade and a magic spark";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
magic = library("lib/magic.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.4,weapon.blade) + p(.3,1,magic.shimmer)*.7) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.514;
