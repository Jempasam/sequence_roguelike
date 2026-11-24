declare name "mad_alchemist";
declare description "a laugh and a bubbling flask";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
bubble_450 = library("../lib/halt_voices/bubble_450.lib.dsp");
pour = library("../lib/halt_voices/pour.lib.dsp");

mix0(t) = (p(0,.4,human.laugh(260)) + p(.3,.8,pour.sound)*.5 + p(.5,1,bubble_450.sound)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.841;
