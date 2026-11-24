declare name "hypnotist";
declare description "a wavering hypnotic wave";
declare duration "0.9";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");

hyp(u) = (os.osc(330 + 60 * os.osc(4)) * .4 + sfx.inst.pad(220,u) * .3) * sfx.env.fadeio(.2,.5,u);
mix0(t) = (p(0,1,hyp)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.912;
