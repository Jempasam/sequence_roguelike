declare name "dragon";
declare description "any dragon: a roar";
declare duration "0.9";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
beast = library("../lib/beast.lib.dsp");
size = library("../filters/size.lib.dsp");

mix0(t) = (p(0,1,sfx.fire.roar)*.12 + p(0,.6,beast.growl(100))*.7) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.5, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 1.047;
