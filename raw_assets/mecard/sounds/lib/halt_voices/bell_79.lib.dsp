declare name "bell_79";
declare description "a voice shared by the halts: sfx.inst.bell(ba.midikey2hz(79),u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.inst.bell(ba.midikey2hz(79),t);

process(t) = sound(t);
