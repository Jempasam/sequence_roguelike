declare name "lead_67";
declare description "a voice shared by the halts: sfx.inst.lead(ba.midikey2hz(67),u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.inst.lead(ba.midikey2hz(67),t);

process(t) = sound(t);
