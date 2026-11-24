declare name "ogre_crusher";
declare description "a bellow and a crush";
declare duration "1.1";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,.7,human.effort(60)) + p(.5,1,sfx.perc.boom)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(2, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.741;
