declare name "megalaser";
declare description "a charge, then the shot";
declare duration "1.2";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
machine = library("lib/machine.lib.dsp");
size = library("filters/size.lib.dsp");
zap = library("../lib/halt_voices/zap.lib.dsp");

mix0(t) = (p(0,.6,machine.charge) + p(.55,.8,zap.sound) + p(.6,1,sfx.perc.boom)*.9) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.8, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.229;
