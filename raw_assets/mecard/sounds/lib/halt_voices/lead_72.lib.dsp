declare name "lead_72";
declare description "a voice shared by the halts: sfx.inst.lead(ba.midikey2hz(72),u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.inst.lead(ba.midikey2hz(72),t);

process(t) = sound(t);
