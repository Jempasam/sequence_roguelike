declare name "slime";
declare description "a gooey blorp";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
slime = library("lib/slime.lib.dsp");
wet = library("filters/wet.lib.dsp");

mix0(t) = (p(0,1,slime.blorp(180))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = wet.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 2.138;
