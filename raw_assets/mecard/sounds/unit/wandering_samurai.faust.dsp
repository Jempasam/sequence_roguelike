declare name "wandering_samurai";
declare description "a kiai and a sliding blade";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.3,human.cry(200)) + p(.25,.8,weapon.blade)*.8 + p(.5,1,sfx.inst.flute(784))*.3) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.955;
