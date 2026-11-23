declare name "overheated";
declare description "a hot hiss over a rising saw";
declare duration "0.45";

import("sfx.lib");

process(t) = (no.noise : fi.highpass(2, 3000)) * sfx.env.fadeio(0.1, 0.8, t) * 0.2 + sfx.osc.saw(sfx.env.sweep(200, 500, t)) * sfx.env.fadeio(0.1, 0.8, t) * 0.12;
