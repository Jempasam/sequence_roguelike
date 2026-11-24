declare name "dark_lord";
declare description "a deep laugh and muffled thunder";
declare duration "1.2";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
hollow = library("filters/hollow.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,1,human.old_cry(70)) + p(0,1,sfx.nature.thunder)*.7) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);
mix2(t) = size.filter(1.7, mix1, t);

process(t) = finish.filter(0.4, 0.4, mix2, t) * 0.327;
