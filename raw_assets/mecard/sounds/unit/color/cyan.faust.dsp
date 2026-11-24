declare name "cyan";
declare description "a crystal drop";
declare duration "0.6";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
magic = library("../lib/magic.lib.dsp");

mix0(t) = (p(0,.5,sfx.water.drop(900)) + p(.2,1,magic.chime(1320))*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.202;
