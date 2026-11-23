declare name "enchanter";
declare description "a card enchanted: a chime rising, then a flash";
declare duration "1";

import("sfx.lib");

v0(u) = (sfx.inst.bell(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.inst.bell(ba.midikey2hz(76),u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.inst.bell(ba.midikey2hz(79),u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.bell(ba.midikey2hz(84),u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.osc.fm(1568,1.41,1)*sfx.env.decay(7,u)*sfx.env.attack(.02,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.3000, v0, t) * 0.6
    +     sfx.sequence.part(0.1000, 0.4000, v1, t) * 0.6
    +     sfx.sequence.part(0.2000, 0.5000, v2, t) * 0.6
    +     sfx.sequence.part(0.3000, 0.6000, v3, t) * 0.6
    +     sfx.sequence.part(0.4000, 1.0000, v4, t) * 0.35
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
