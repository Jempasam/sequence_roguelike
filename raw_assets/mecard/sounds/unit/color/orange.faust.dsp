declare name "orange";
declare description "a soft crackle of flame";
declare duration "0.6";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
element = library("../lib/element.lib.dsp");

mix0(t) = (p(0,1,element.flame)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 2.57;
