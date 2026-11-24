declare name "goblin_mecha";
declare description "a cackle inside a mecha";
declare duration "1";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
goblin = library("lib/goblin.lib.dsp");
machine = library("lib/machine.lib.dsp");
metal = library("filters/metal.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,.5,goblin.cackle(4,380)) + p(.2,1,machine.whirr)*.7) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = metal.filter(mix0, t);
mix2(t) = size.filter(1.8, mix1, t);

process(t) = finish.filter(0.4, 0.4, mix2, t) * 0.398;
