declare name "hydra";
declare description "three hissing roars";
declare duration "1.1";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
size = library("filters/size.lib.dsp");
wet = library("filters/wet.lib.dsp");

mix0(t) = ((p(0,.4,sfx.fire.roar) + p(.3,.7,sfx.fire.roar) + p(.6,1,sfx.fire.roar))*.12) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.8, mix0, t);
mix2(t) = wet.filter(mix1, t);

process(t) = finish.filter(0.4, 0.4, mix2, t) * 6.683;
