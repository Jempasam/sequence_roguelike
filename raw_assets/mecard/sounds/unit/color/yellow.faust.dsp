declare name "yellow";
declare description "a bright bell";
declare duration "0.6";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
bell_88 = library("../../lib/halt_voices/bell_88.lib.dsp");
pluck_79 = library("../../lib/halt_voices/pluck_79.lib.dsp");

mix0(t) = (p(0,.6,bell_88.sound)*.6 + p(.2,1,pluck_79.sound)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.38;
