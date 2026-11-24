declare name "wolf";
declare description "a short growl then a yelp";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");

mix0(t) = (p(0,.5,beast.growl(150)) + p(.4,1,beast.howl(420))*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.023;
