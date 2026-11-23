declare name "dark_strategist";
declare description "cards swapped with a monster: the low order, two cards exchanged";
declare duration "1.8";

import("sfx.lib");

v0(u) = (sfx.voice.grunt(70,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.cloth(0.5,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.cloth(0.5,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = ((sfx.inst.organ(ba.midikey2hz(57),u) + sfx.inst.organ(ba.midikey2hz(60),u) + sfx.inst.organ(ba.midikey2hz(64),u)) * 0.47) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.3333, v0, t) * 0.6
    + sfx.sequence.part(0.3889, 0.5556, v1, t) * 0.5
    + sfx.sequence.part(0.5, 0.6667, v2, t) * 0.5
    + sfx.sequence.part(0.6111, 1, v3, t) * 0.4
) : sfx.fx.reverb(0.9, 0.3) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.8408);
