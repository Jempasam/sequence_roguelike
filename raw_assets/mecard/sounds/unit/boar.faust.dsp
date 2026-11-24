declare name "boar";
declare description "a short nasal grunt and a snort";
declare duration "0.45";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,.5,beast.snort) + p(.1,.8,beast.growl(130))*.8) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(0.9, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.403;
