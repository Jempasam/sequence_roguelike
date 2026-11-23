declare name "dark_tavern";
declare description "a monster joins: a mug breaking, an out of tune fiddle";
declare duration "1.6";

import("sfx.lib");

v0(u) = (sfx.impact.plastic(450,0.9,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.noise.hiss(4000) * sfx.env.decay(8,u) * 2) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.inst.lead(ba.midikey2hz(66.4),u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.lead(ba.midikey2hz(71.4),u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.lead(ba.midikey2hz(67.6),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.1875, v0, t) * 0.7
    + sfx.sequence.part(0, 0.1875, v1, t) * 0.5
    + sfx.sequence.part(0.3125, 0.5625, v2, t) * 0.5
    + sfx.sequence.part(0.5, 0.75, v3, t) * 0.5
    + sfx.sequence.part(0.6875, 1, v4, t) * 0.5
) : sfx.fx.reverb(0.9, 0.3) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.8222);
