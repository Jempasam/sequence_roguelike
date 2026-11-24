declare name "lancer";
declare description "a cry and a whistling lance";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.4,human.cry(150)) + p(.3,.8,weapon.whoosh)*.5 + p(.7,1,thud.sound)*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.26;
