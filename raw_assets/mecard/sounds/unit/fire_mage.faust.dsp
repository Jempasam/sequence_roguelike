declare name "fire_mage";
declare description "a whoosh of flame";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
magic = library("lib/magic.lib.dsp");
element = library("lib/element.lib.dsp");

mix0(t) = (p(0,.8,element.flame) + p(0,.6,magic.cast(400,1400))*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.269;
