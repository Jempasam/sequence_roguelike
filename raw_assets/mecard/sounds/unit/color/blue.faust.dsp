declare name "blue";
declare description "a cold wave";
declare duration "0.7";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
magic = library("../lib/magic.lib.dsp");

mix0(t) = (p(0,1,magic.cast(2000,300))*.8 + p(0,1,sfx.inst.pad(260))*.3) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.085;
