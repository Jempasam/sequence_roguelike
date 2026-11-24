declare name "imp";
declare description "a high cackle and a flame";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
goblin = library("lib/goblin.lib.dsp");
element = library("lib/element.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,.6,goblin.cackle(9,600)) + p(.3,1,element.flame)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(0.6, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.708;
