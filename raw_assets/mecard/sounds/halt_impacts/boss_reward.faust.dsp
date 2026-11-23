declare name "boss_reward";
declare description "a boss prize taken: a drum, a pile of gold, a triumphant fanfare";
declare duration "1.6";

import("sfx.lib");

v0(u) = (sfx.perc.tom(70,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v6(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v7(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v8(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v9(u) = (sfx.inst.lead(ba.midikey2hz(60),u)) * sfx.env.fadeio(.002, .1, u);
v10(u) = (sfx.inst.lead(ba.midikey2hz(64),u)) * sfx.env.fadeio(.002, .1, u);
v11(u) = (sfx.inst.lead(ba.midikey2hz(67),u)) * sfx.env.fadeio(.002, .1, u);
v12(u) = (sfx.inst.lead(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);
v13(u) = (sfx.inst.lead(ba.midikey2hz(76),u)) * sfx.env.fadeio(.002, .1, u);
v14(u) = (sfx.voice.monks(98,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.1563, v0, t) * 0.8
    +     sfx.sequence.part(0.0625, 0.1875, v1, t) * 0.4
    +     sfx.sequence.part(0.0969, 0.2219, v2, t) * 0.4
    +     sfx.sequence.part(0.1312, 0.2562, v3, t) * 0.4
    +     sfx.sequence.part(0.1656, 0.2906, v4, t) * 0.4
    +     sfx.sequence.part(0.2000, 0.3250, v5, t) * 0.4
    +     sfx.sequence.part(0.2344, 0.3594, v6, t) * 0.4
    +     sfx.sequence.part(0.2687, 0.3937, v7, t) * 0.4
    +     sfx.sequence.part(0.3031, 0.4281, v8, t) * 0.4
    +     sfx.sequence.part(0.3125, 0.6250, v9, t) * 0.6
    +     sfx.sequence.part(0.3750, 0.6875, v10, t) * 0.6
    +     sfx.sequence.part(0.4375, 0.7500, v11, t) * 0.6
    +     sfx.sequence.part(0.5000, 0.8125, v12, t) * 0.6
    +     sfx.sequence.part(0.5625, 0.8750, v13, t) * 0.6
    +     sfx.sequence.part(0.3125, 1.0000, v14, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
