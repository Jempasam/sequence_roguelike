declare name "great_witch";
declare description "a potion given three times: three vials, a green flash and a choir";
declare duration "2.4";

import("sfx.lib");

v0(u) = (sfx.water.pour(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.water.bubble(300,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.water.pour(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.water.bubble(400,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.water.pour(u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.water.bubble(520,u)) * sfx.env.fadeio(.002, .1, u);
v6(u) = ((no.noise : sfx.filter.sweep_bp(300,5000,2,u)) * sfx.env.decay(2.5,u) * 6 + sfx.retro.powerup(u)) * sfx.env.fadeio(.002, .1, u);
v7(u) = ((sfx.voice.ooh(ba.midikey2hz(64),u) + sfx.voice.ooh(ba.midikey2hz(67),u) + sfx.voice.ooh(ba.midikey2hz(71),u)) * 0.47) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.25, v0, t) * 0.5
    + sfx.sequence.part(0.0625, 0.1875, v1, t) * 0.4
    + sfx.sequence.part(0.25, 0.5, v2, t) * 0.5
    + sfx.sequence.part(0.3125, 0.4375, v3, t) * 0.4
    + sfx.sequence.part(0.5, 0.75, v4, t) * 0.5
    + sfx.sequence.part(0.5625, 0.6875, v5, t) * 0.4
    + sfx.sequence.part(0.6667, 1, v6, t) * 0.4
    + sfx.sequence.part(0.6667, 1, v7, t) * 0.3
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.8511);
