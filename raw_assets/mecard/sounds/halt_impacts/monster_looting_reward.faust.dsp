declare name "monster_looting_reward";
declare description "monster loot taken: the bag falls, gold found, a hesitant joy";
declare duration "0.75";

import("sfx.lib");

v0(u) = (sfx.perc.thud(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.marimba(ba.midikey2hz(71),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.2667, v0, t) * 0.8
    +     sfx.sequence.part(0.2000, 0.4667, v1, t) * 0.5
    +     sfx.sequence.part(0.3333, 0.6000, v2, t) * 0.5
    +     sfx.sequence.part(0.5333, 1.0000, v3, t) * 0.8
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
