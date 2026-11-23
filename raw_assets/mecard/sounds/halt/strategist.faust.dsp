declare name "strategist";
declare description "a plan taught: the order given, the pieces moved";
declare duration "1.6";

import("sfx.lib");

v0(u) = (sfx.perc.tom(150,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.sequence.euclid(3,4,0,sfx.impact.wood(500,0.6),u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.inst.pluck(ba.midikey2hz(67),u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.pluck(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.1875, v0, t) * 0.7
    + sfx.sequence.part(0.3125, 0.6875, v1, t) * 0.5
    + sfx.sequence.part(0.6875, 0.875, v2, t) * 0.5
    + sfx.sequence.part(0.8125, 1, v3, t) * 0.5
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.4622);
