declare name "red";
declare description "a warm growl";
declare duration "0.6";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
beast = library("../lib/beast.lib.dsp");

mix0(t) = (p(0,1,beast.growl(120))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.851;
