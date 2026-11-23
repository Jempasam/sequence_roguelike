declare name "dark_tavern";
declare description "a monster joins: a mug breaking, an out of tune fiddle";
declare duration "0.85";

import("sfx.lib");

v0(u) = (sfx.impact.plastic(300,.8,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.inst.lead(ba.midikey2hz(63.6),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.2941, v0, t) * 0.8
    +     sfx.sequence.part(0.2353, 1.0000, v1, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
