declare name "elite_reward";
declare description "an elite prize taken: a drum, a burst of gold, a three note fanfare";
declare duration "1.05";

import("sfx.lib");

v0(u) = (sfx.perc.tom(100,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v6(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v7(u) = (sfx.inst.lead(ba.midikey2hz(67),u)) * sfx.env.fadeio(.002, .1, u);
v8(u) = (sfx.inst.lead(ba.midikey2hz(71),u)) * sfx.env.fadeio(.002, .1, u);
v9(u) = (sfx.inst.lead(ba.midikey2hz(74),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.1905, v0, t) * 0.7
    +     sfx.sequence.part(0.0952, 0.2857, v1, t) * 0.4
    +     sfx.sequence.part(0.1429, 0.3333, v2, t) * 0.4
    +     sfx.sequence.part(0.1905, 0.3810, v3, t) * 0.4
    +     sfx.sequence.part(0.2381, 0.4286, v4, t) * 0.4
    +     sfx.sequence.part(0.2857, 0.4762, v5, t) * 0.4
    +     sfx.sequence.part(0.3333, 0.5238, v6, t) * 0.4
    +     sfx.sequence.part(0.3333, 0.7143, v7, t) * 0.6
    +     sfx.sequence.part(0.4762, 0.8571, v8, t) * 0.6
    +     sfx.sequence.part(0.6190, 1.0000, v9, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
