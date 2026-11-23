declare name "great_shop";
declare description "goods bought in quantity: double bell, four coins";
declare duration "0.75";

import("sfx.lib");

v0(u) = (sfx.inst.bell(ba.midikey2hz(84),u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.inst.bell(ba.midikey2hz(79),u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.5333, v0, t) * 0.5
    +     sfx.sequence.part(0.1600, 0.6667, v1, t) * 0.5
    +     sfx.sequence.part(0.3333, 0.6000, v2, t) * 0.4
    +     sfx.sequence.part(0.4400, 0.7067, v3, t) * 0.4
    +     sfx.sequence.part(0.5467, 0.8133, v4, t) * 0.4
    +     sfx.sequence.part(0.6533, 0.9200, v5, t) * 0.4
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
