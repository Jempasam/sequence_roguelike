declare name "golem";
declare description "any golem: stone";
declare duration "0.8";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
element = library("../lib/element.lib.dsp");
size = library("../filters/size.lib.dsp");

mix0(t) = (p(0,1,element.earth)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.5, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.389;
