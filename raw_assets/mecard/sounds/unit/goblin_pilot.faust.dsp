declare name "goblin_pilot";
declare description "a cackle over the radio, then beeps";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
goblin = library("lib/goblin.lib.dsp");
machine = library("lib/machine.lib.dsp");

mix0(t) = (p(0,.7,goblin.cackle(5,450)) + p(.6,1,machine.beeps(1500,4))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.841;
