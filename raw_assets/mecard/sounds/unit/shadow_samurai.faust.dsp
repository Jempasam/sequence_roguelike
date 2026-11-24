declare name "shadow_samurai";
declare description "a muffled kiai and a blade";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
hollow = library("filters/hollow.lib.dsp");

mix0(t) = (p(0,.3,human.cry(180)) + p(.25,.8,weapon.blade)*.8) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.442;
