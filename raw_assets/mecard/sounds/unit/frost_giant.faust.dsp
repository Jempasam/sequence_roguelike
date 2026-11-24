declare name "frost_giant";
declare description "an icy roar";
declare duration "1.1";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
element = library("lib/element.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,.8,human.deep_cry(60)) + p(.3,1,element.frost)*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(2, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.596;
