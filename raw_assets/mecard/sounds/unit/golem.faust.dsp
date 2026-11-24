declare name "golem";
declare description "a stone rumble";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
element = library("lib/element.lib.dsp");
size = library("filters/size.lib.dsp");
tom_60 = library("../lib/halt_voices/tom_60.lib.dsp");

mix0(t) = (p(0,1,element.earth) + p(0,.6,tom_60.sound)*.7) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.5, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.422;
