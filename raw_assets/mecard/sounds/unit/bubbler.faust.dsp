declare name "bubbler";
declare description "a rhythmic gurgle";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
slime = library("lib/slime.lib.dsp");

mix0(t) = (p(0,1,slime.burble)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.303;
