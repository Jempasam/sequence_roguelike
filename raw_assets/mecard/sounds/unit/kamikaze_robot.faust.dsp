declare name "kamikaze_robot";
declare description "accelerating beeps and an alarm";
declare duration "0.9";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
machine = library("lib/machine.lib.dsp");

mix0(t) = (p(0,.8,machine.beeps(1200,6)) + p(.6,1,sfx.mech.siren)*.2) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.135;
