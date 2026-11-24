declare name "bull";
declare description "a bellow and a stamp";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
size = library("filters/size.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.9,beast.growl(100)) + p(.5,1,thud.sound)*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.4, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.741;
