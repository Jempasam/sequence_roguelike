declare name "battle_reward";
declare description "a battle prize taken: gold, a short fanfare";
declare duration "0.75";

import("sfx.lib");

v0(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.lead(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.lead(ba.midikey2hz(79),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.2667, v0, t) * 0.5
    +     sfx.sequence.part(0.1333, 0.4000, v1, t) * 0.5
    +     sfx.sequence.part(0.2667, 0.5333, v2, t) * 0.5
    +     sfx.sequence.part(0.4000, 0.6667, v3, t) * 0.6
    +     sfx.sequence.part(0.6000, 1.0000, v4, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
