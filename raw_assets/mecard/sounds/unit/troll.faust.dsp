declare name "troll";
declare description "a stony grunt";
declare duration "0.9";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
element = library("lib/element.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,.8,human.effort(70)) + p(0,1,element.earth)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.6, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.841;
