declare name "magma_dragon";
declare description "a roar and boiling lava";
declare duration "1.2";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,1,sfx.fire.roar)*.12 + p(0,1,sfx.fire.lava(6,3))*.7 + p(0,.3,sfx.perc.boom)*.8) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(2, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 1.303;
