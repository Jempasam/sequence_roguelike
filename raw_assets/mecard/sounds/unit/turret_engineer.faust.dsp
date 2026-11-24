declare name "turret_engineer";
declare description "a latch, a beep, a servo";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
machine = library("lib/machine.lib.dsp");
latch = library("../lib/halt_voices/latch.lib.dsp");
servo = library("../lib/halt_voices/servo.lib.dsp");

mix0(t) = (p(0,.2,latch.sound) + p(.2,.6,machine.beeps(880,3)) + p(.5,1,servo.sound)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.23;
