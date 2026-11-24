declare name "dark";
declare description "any dark unit: a hollow cry";
declare duration "0.9";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
human = library("../lib/human.lib.dsp");
hollow = library("../filters/hollow.lib.dsp");

mix0(t) = (p(0,1,human.old_cry(80))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.716;
