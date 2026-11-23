declare name "great_shop";
declare description "goods bought in quantity: a double bell, four coins, a ring-out";
declare duration "2";

import("sfx.lib");

v0(u) = (sfx.inst.bell(ba.midikey2hz(79),u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.inst.bell(ba.midikey2hz(84),u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.cloth(0.4,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v6(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v7(u) = (sfx.impact.metal(1200,0.5,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.45, v0, t) * 0.6
    + sfx.sequence.part(0.06, 0.51, v1, t) * 0.6
    + sfx.sequence.part(0.05, 0.2, v2, t) * 0.3
    + sfx.sequence.part(0.25, 0.4, v3, t) * 0.5
    + sfx.sequence.part(0.35, 0.5, v4, t) * 0.5
    + sfx.sequence.part(0.45, 0.6, v5, t) * 0.5
    + sfx.sequence.part(0.55, 0.7, v6, t) * 0.5
    + sfx.sequence.part(0.6, 1, v7, t) * 0.3
) : sfx.fx.reverb(0.5, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.8408);
