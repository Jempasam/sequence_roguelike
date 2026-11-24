declare name "swamp_sorcerer";
declare description "gurgles and a croak";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
slime = library("lib/slime.lib.dsp");
wet = library("filters/wet.lib.dsp");

mix0(t) = (p(0,.8,slime.burble)*.6 + p(.2,.8,sfx.life.frog(130))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = wet.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 1.641;
