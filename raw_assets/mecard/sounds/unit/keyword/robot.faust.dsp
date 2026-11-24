declare name "robot";
declare description "any robot: a whirr and beeps";
declare duration "0.7";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
machine = library("../lib/machine.lib.dsp");
metal = library("../filters/metal.lib.dsp");

mix0(t) = (p(0,.6,machine.whirr)*.6 + p(.3,1,machine.beeps(1000,4))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = metal.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 1.189;
