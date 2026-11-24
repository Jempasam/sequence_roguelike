declare name "druid";
declare description "a forest breath and a flute";
declare duration "0.9";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
element = library("lib/element.lib.dsp");

mix0(t) = (p(0,1,element.leaf)*.6 + p(.2,1,sfx.inst.flute(587))*.6 + p(0,1,sfx.nature.wind)*.3) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.891;
