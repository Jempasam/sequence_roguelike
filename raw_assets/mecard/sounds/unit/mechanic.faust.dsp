declare name "mechanic";
declare description "a wrench clicks and a servo";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
click_04 = library("../lib/halt_voices/click_04.lib.dsp");
servo = library("../lib/halt_voices/servo.lib.dsp");

mix0(t) = (p(0,.2,click_04.sound) + p(.2,.4,click_04.sound) + p(.4,.6,click_04.sound) + p(.5,1,servo.sound)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.977;
