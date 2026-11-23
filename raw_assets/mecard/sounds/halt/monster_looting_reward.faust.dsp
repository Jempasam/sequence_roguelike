declare name "monster_looting_reward";
declare description "monster loot taken: the bag falls, gold found, a hesitant joy";
declare duration "1.8";

import("sfx.lib");

v0(u) = (sfx.impact.cloth(0.6,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.perc.thud(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = ((sfx.noise.crackle(.05) : sfx.filter.bpf(4000,1.5)) * sfx.env.decay(2,u) * 2) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.flute(ba.midikey2hz(64),u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.inst.flute(ba.midikey2hz(67),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.1944, v0, t) * 0.7
    + sfx.sequence.part(0.0278, 0.1389, v1, t) * 0.5
    + sfx.sequence.part(0.2778, 0.5, v2, t) * 0.4
    + sfx.sequence.part(0.5, 0.7222, v3, t) * 0.4
    + sfx.sequence.part(0.6111, 0.8333, v4, t) * 0.4
    + sfx.sequence.part(0.7778, 1, v5, t) * 0.4
) : sfx.fx.reverb(0.7, 0.15) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.0893);
