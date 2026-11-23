declare name "necromancer";
declare description "loot hearts received: heartbeats, a veiled bell";
declare duration "1";

import("sfx.lib");

v0(u) = (sfx.perc.kick(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.perc.kick(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.inst.bell(ba.midikey2hz(60),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.2500, v0, t) * 0.8
    +     sfx.sequence.part(0.3000, 0.5500, v1, t) * 0.6
    +     sfx.sequence.part(0.6000, 1.0000, v2, t) * 0.7
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
