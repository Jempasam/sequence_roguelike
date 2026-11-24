declare name "dark";
declare description "the end of a halt in a big dark room";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");

filter(s, t) = finish.filter(0.9, 0.3, s, t);
