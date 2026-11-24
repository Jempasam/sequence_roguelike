declare name "apothecary";
declare description "vials and a pour";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
bell_88 = library("../lib/halt_voices/bell_88.lib.dsp");
pour = library("../lib/halt_voices/pour.lib.dsp");

mix0(t) = (p(0,.4,bell_88.sound)*.4 + p(.2,1,pour.sound)*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 2.213;
