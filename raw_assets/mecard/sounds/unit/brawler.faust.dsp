declare name "brawler";
declare description "a grunt and a punch";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.5,human.effort(110)) + p(.35,1,thud.sound)*.8) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.047;
