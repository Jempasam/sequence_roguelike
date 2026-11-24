declare name "spiritist";
declare description "a call to the spirits";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
ghost = library("lib/ghost.lib.dsp");
bell_84 = library("../lib/halt_voices/bell_84.lib.dsp");

mix0(t) = (p(0,1,ghost.wail(300))*.7 + p(.3,1,bell_84.sound)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.396;
