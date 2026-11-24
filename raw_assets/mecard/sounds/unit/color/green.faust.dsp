declare name "green";
declare description "a rustle of nature";
declare duration "0.6";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
element = library("../lib/element.lib.dsp");
pluck_72 = library("../../lib/halt_voices/pluck_72.lib.dsp");

mix0(t) = (p(0,1,element.leaf) + p(.3,1,pluck_72.sound)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 2.317;
