declare name "artificer";
declare description "a beep, a spark, a bell";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
machine = library("lib/machine.lib.dsp");
bell_84 = library("../lib/halt_voices/bell_84.lib.dsp");
zap = library("../lib/halt_voices/zap.lib.dsp");

mix0(t) = (p(0,.3,zap.sound)*.7 + p(.2,1,bell_84.sound)*.5 + p(.3,1,machine.whirr)*.3) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.514;
