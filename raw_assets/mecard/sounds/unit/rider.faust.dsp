declare name "rider";
declare description "a cry and a gallop";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
human = library("lib/human.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.4,human.cry(170)) + p(.3,.7,beast.neigh(480))*.6 + p(.65,.8,thud.sound)*.5 + p(.8,.95,thud.sound)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.096;
