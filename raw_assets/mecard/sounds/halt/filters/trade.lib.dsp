declare name "trade";
declare description "the end of a halt in a small, close room";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");

filter(s, t) = finish.filter(0.5, 0.1, s, t);
