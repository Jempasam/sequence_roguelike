declare name "bell_88";
declare description "a voice shared by the halts: sfx.inst.bell(ba.midikey2hz(88),u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.inst.bell(ba.midikey2hz(88),t);

process(t) = sound(t);
