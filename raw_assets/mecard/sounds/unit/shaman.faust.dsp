declare name "shaman";
declare description "drums and a chant";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
tom_100 = library("../lib/halt_voices/tom_100.lib.dsp");
tom_150 = library("../lib/halt_voices/tom_150.lib.dsp");

mix0(t) = (p(0,.2,tom_100.sound) + p(.25,.45,tom_100.sound) + p(.5,.7,tom_150.sound) + p(.3,1,sfx.voice.choir_v(4,150))*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.349;
