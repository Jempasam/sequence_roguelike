declare name "fallback";
declare description "a halt with no sound of its own: a plain confirmation";
declare duration "0.3";

import("sfx.lib");

v0(u) = (sfx.retro.confirm(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 1.0000, v0, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
