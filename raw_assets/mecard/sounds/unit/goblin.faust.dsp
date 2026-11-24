declare name "goblin";
declare description "a high cackle";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
goblin = library("lib/goblin.lib.dsp");

mix0(t) = (p(0,1,goblin.cackle(1,420))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.567;
