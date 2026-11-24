declare name "berserker";
declare description "a howl of rage";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
human = library("lib/human.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,1,human.cry(130)) + p(0,.8,beast.growl(100))*.7) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.2, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.596;
