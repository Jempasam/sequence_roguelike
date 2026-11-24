declare name "big_bad_wolf";
declare description "a deep, long howl";
declare duration "1.2";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,1,beast.howl(260))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.6, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.556;
