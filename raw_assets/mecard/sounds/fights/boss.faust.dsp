declare name "boss";
declare description "a deep boom with a low gong: the guardian";
declare duration "1.4";

import("sfx.lib");

process(t) = (sfx.perc.boom(t) * .6 + sfx.perc.clang(150, t) * .5 : sfx.fx.reverb(.8, .25)) : sfx.fx.dcblock : *(0.919);
