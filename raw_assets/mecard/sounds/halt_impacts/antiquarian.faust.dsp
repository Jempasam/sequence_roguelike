declare name "antiquarian";
declare description "a card sold: the shop bell, then the gold received";
declare duration "0.6";

import("sfx.lib");

v0(u) = (sfx.inst.bell(ba.midikey2hz(79),u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.8333, v0, t) * 0.6
    +     sfx.sequence.part(0.2500, 0.5833, v1, t) * 0.5
    +     sfx.sequence.part(0.4167, 0.7500, v2, t) * 0.5
    +     sfx.sequence.part(0.5833, 0.9167, v3, t) * 0.5
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
