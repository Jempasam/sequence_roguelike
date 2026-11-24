declare name "bear";
declare description "a low growl that rises";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
size = library("filters/size.lib.dsp");
rumble_120 = library("../lib/halt_voices/rumble_120.lib.dsp");

mix0(t) = (p(0,1,beast.growl(90)) + p(0,.6,rumble_120.sound)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.5, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.229;
