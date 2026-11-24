declare name "stone_golem";
declare description "a heavy crack";
declare duration "1";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
element = library("lib/element.lib.dsp");
size = library("filters/size.lib.dsp");
rumble_120 = library("../lib/halt_voices/rumble_120.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.7,element.earth) + p(0,1,rumble_120.sound)*.5 + p(.3,.6,thud.sound)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.7, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.146;
