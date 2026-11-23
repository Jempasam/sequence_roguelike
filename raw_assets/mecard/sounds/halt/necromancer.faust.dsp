declare name "necromancer";
declare description "loot hearts received: heartbeats, a veiled bell";
declare duration "1.8";

import("sfx.lib");

v0(u) = (sfx.perc.tom(60,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.perc.tom(60,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.perc.tom(60,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.perc.tom(60,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.bell(ba.midikey2hz(55),u) : sfx.filter.lpf(900,.7)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.noise.rumble(120) * sfx.env.decay(1.5,u) * 4) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.1667, v0, t) * 0.7
    + sfx.sequence.part(0.1667, 0.3333, v1, t) * 0.6
    + sfx.sequence.part(0.4444, 0.6111, v2, t) * 0.7
    + sfx.sequence.part(0.6111, 0.7778, v3, t) * 0.6
    + sfx.sequence.part(0.5556, 1, v4, t) * 0.5
    + sfx.sequence.part(0, 1, v5, t) * 0.25
) : sfx.fx.reverb(0.9, 0.3) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.5888);
