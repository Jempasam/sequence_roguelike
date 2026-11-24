declare name "gravitationist";
declare description "a deep pull";
declare duration "0.9";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
rumble_120 = library("../lib/halt_voices/rumble_120.lib.dsp");

grav(u) = os.osc(sfx.env.sweep(400,40,u)) * sfx.env.fadeio(.05,.5,u) * .8;
mix0(t) = (p(0,1,grav) + p(0,1,rumble_120.sound)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.266;
