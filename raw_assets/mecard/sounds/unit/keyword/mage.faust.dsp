declare name "mage";
declare description "any mage: a spell";
declare duration "0.7";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
magic = library("../lib/magic.lib.dsp");

mix0(t) = (p(0,.7,magic.cast(350,1100)) + p(.5,1,magic.chime(740))*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.114;
