declare name "master_trainer";
declare description "a master ally joins: three blows, a horn and a chord";
declare duration "1.25";

import("sfx.lib");

v0(u) = (sfx.impact.wood(170,.9,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.wood(170,.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.wood(170,.9,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.lead(ba.midikey2hz(55),u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = ((sfx.inst.pad(ba.midikey2hz(55),u)+sfx.inst.pad(ba.midikey2hz(59),u)+sfx.inst.pad(ba.midikey2hz(62),u)+sfx.inst.pad(ba.midikey2hz(67),u))*.5) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.1600, v0, t) * 0.8
    +     sfx.sequence.part(0.1600, 0.3200, v1, t) * 0.8
    +     sfx.sequence.part(0.3200, 0.4800, v2, t) * 0.8
    +     sfx.sequence.part(0.4800, 1.0000, v3, t) * 0.6
    +     sfx.sequence.part(0.4800, 1.0000, v4, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
