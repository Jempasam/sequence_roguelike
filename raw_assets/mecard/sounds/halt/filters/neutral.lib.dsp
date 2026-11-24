declare name "neutral";
declare description "the end of a halt in a plain room";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");

filter(s, t) = finish.filter(0.6, 0.1, s, t);
