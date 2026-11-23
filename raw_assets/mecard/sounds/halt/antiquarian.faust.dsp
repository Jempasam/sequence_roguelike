declare name "antiquarian";
declare description "a card sold: the old shop bell, a clock tick, the gold received";
declare duration "1.6";

import("sfx.lib");

v0(u) = (sfx.inst.bell(ba.midikey2hz(76),u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.cloth(0.3,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.wood(700,0.7,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.marimba(ba.midikey2hz(64),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5625, v0, t) * 0.6
    + sfx.sequence.part(0.0625, 0.25, v1, t) * 0.3
    + sfx.sequence.part(0.375, 0.5313, v2, t) * 0.4
    + sfx.sequence.part(0.5625, 0.8125, v3, t) * 0.5
    + sfx.sequence.part(0.625, 1, v4, t) * 0.3
) : sfx.fx.reverb(0.5, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.4547);
