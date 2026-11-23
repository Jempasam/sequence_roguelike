declare name "merchant";
declare description "an item given: gold paid, the item handed over";
declare duration "0.65";

import("sfx.lib");

v0(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.inst.marimba(ba.midikey2hz(79),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.3077, v0, t) * 0.6
    +     sfx.sequence.part(0.1538, 0.4615, v1, t) * 0.6
    +     sfx.sequence.part(0.4615, 1.0000, v2, t) * 0.8
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
