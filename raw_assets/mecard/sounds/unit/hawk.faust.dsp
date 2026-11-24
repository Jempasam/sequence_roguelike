declare name "hawk";
declare description "a piercing cry";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");

mix0(t) = (p(0,1,beast.screech(1500))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.098;
