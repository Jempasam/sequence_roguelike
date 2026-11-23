declare name "shop";
declare description "a good bought: the counter bell, two coins";
declare duration "0.55";

import("sfx.lib");

v0(u) = (sfx.inst.bell(ba.midikey2hz(84),u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.9091, v0, t) * 0.6
    +     sfx.sequence.part(0.2727, 0.6364, v1, t) * 0.5
    +     sfx.sequence.part(0.4909, 0.9091, v2, t) * 0.5
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
