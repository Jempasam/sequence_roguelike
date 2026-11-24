declare name "martyr";
declare description "a choir and a broken bell";
declare duration "0.9";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
bell_88 = library("../lib/halt_voices/bell_88.lib.dsp");

mix0(t) = (p(0,1,sfx.voice.choir_v(4,330))*.6 + p(.4,1,bell_88.sound)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.641;
