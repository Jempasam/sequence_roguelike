declare name "fallback";
declare description "a halt with no sound of its own: a plain confirmation";
declare duration "1";

import("sfx.lib");

v0(u) = (sfx.retro.confirm(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.inst.pluck(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.3, v0, t) * 0.6
    + sfx.sequence.part(0.1, 0.9, v1, t) * 0.4
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.7989);
