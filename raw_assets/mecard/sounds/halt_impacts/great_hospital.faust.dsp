declare name "great_hospital";
declare description "full heal: monitor, then a long healing chord";
declare duration "1.25";

import("sfx.lib");

v0(u) = (sfx.mech.beep(660,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.mech.beep(880,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = ((sfx.inst.pad(ba.midikey2hz(60),u)+sfx.inst.pad(ba.midikey2hz(64),u)+sfx.inst.pad(ba.midikey2hz(67),u)+sfx.inst.pad(ba.midikey2hz(72),u))*.5) * sfx.env.fadeio(.002, .1, u);
v3(u) = ((sfx.inst.bell(ba.midikey2hz(72),u)+sfx.inst.bell(ba.midikey2hz(79),u))*.5) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.1600, v0, t) * 0.5
    +     sfx.sequence.part(0.1600, 0.3200, v1, t) * 0.5
    +     sfx.sequence.part(0.3200, 1.0000, v2, t) * 0.7
    +     sfx.sequence.part(0.3200, 1.0000, v3, t) * 0.5
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
