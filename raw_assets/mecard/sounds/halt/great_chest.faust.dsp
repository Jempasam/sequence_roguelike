declare name "great_chest";
declare description "cards given: a bigger chest, a longer rolling, a glint";
declare duration "2";

import("sfx.lib");

v0(u) = (sfx.mech.latch(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.creak(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.wood(160,0.8,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.impact.roll_hits(9,4,0.3,sfx.impact.plastic,800,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.bell(ba.midikey2hz(88),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.125, v0, t) * 0.7
    + sfx.sequence.part(0.1, 0.45, v1, t) * 0.5
    + sfx.sequence.part(0.425, 0.575, v2, t) * 0.6
    + sfx.sequence.part(0.5, 1, v3, t) * 0.5
    + sfx.sequence.part(0.65, 1, v4, t) * 0.3
) : sfx.fx.reverb(0.6, 0.12) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.7378);
