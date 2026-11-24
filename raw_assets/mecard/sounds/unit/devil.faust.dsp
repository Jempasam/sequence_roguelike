declare name "devil";
declare description "a deep laugh, a flame and thunder";
declare duration "1.2";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
element = library("lib/element.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,1,human.old_cry(70)) + p(.2,1,element.flame)*.6 + p(.6,1,sfx.perc.boom)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.8, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.822;
