declare name "merchant";
declare description "an item given: gold paid, the item handed over, a satisfied note";
declare duration "1.5";

import("sfx.lib");

v0(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.cloth(0.5,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.pluck(ba.midikey2hz(67),u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.pluck(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.impact.metal(1500,0.4,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.2, v0, t) * 0.6
    + sfx.sequence.part(0.1, 0.3, v1, t) * 0.6
    + sfx.sequence.part(0.3333, 0.5333, v2, t) * 0.6
    + sfx.sequence.part(0.5333, 0.8, v3, t) * 0.5
    + sfx.sequence.part(0.6667, 1, v4, t) * 0.5
    + sfx.sequence.part(0.2, 1, v5, t) * 0.25
) : sfx.fx.reverb(0.5, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.6788);
