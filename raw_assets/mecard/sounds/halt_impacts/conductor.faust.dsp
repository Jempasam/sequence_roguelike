declare name "conductor";
declare description "a card moved to the start or end: baton tap, the orchestra retuning";
declare duration "0.65";

import("sfx.lib");

v0(u) = (sfx.impact.tick(3500,.9,u)*2) * sfx.env.fadeio(.002, .1, u);
v1(u) = ((sfx.inst.pad(ba.midikey2hz(60),u)+sfx.inst.pad(ba.midikey2hz(64),u)+sfx.inst.pad(ba.midikey2hz(67),u)+sfx.inst.pad(ba.midikey2hz(72),u))*.5) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.1231, v0, t) * 0.8
    +     sfx.sequence.part(0.1538, 1.0000, v1, t) * 0.7
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
