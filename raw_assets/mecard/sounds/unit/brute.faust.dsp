declare name "brute";
declare description "a heavy grunt and a blow";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
size = library("filters/size.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.7,human.effort(80)) + p(.5,1,thud.sound)*.8) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.5, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.684;
