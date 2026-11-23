declare name "battle_reward";
declare description "a battle prize taken: a coin, then a three note fanfare over a warm pad";
declare duration "1.6";

import("sfx.lib");

v0(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.inst.lead(ba.midikey2hz(67),u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.inst.lead(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.lead(ba.midikey2hz(76),u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = ((sfx.inst.pad(ba.midikey2hz(60),u) + sfx.inst.pad(ba.midikey2hz(64),u) + sfx.inst.pad(ba.midikey2hz(67),u) + sfx.inst.pad(ba.midikey2hz(72),u)) * 0.35) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.2187, v0, t) * 0.6
    + sfx.sequence.part(0.2187, 0.4688, v1, t) * 0.5
    + sfx.sequence.part(0.375, 0.625, v2, t) * 0.5
    + sfx.sequence.part(0.5313, 0.8438, v3, t) * 0.5
    + sfx.sequence.part(0.5, 1, v4, t) * 0.35
) : sfx.fx.reverb(0.7, 0.15) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.8836);
