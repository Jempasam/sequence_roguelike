declare name "demonist";
declare description "a demon voice and a dark flame";
declare duration "0.9";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
element = library("lib/element.lib.dsp");
hollow = library("filters/hollow.lib.dsp");

mix0(t) = (p(0,1,human.old_cry(90)) + p(.2,1,element.flame)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.75;
