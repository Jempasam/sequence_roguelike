declare name "mind_controller";
declare description "a psychic pulse";
declare duration "0.9";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
ghost = library("lib/ghost.lib.dsp");
hollow = library("filters/hollow.lib.dsp");

pulse(u) = os.osc(180) * os.osc(7.3) * sfx.env.fadeio(.1,.4,u);
mix0(t) = (p(0,1,ghost.wail(120)) + p(0,1,pulse)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.716;
