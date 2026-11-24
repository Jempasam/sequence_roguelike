declare name "bell_84";
declare description "a voice shared by the halts: sfx.inst.bell(ba.midikey2hz(84),u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.inst.bell(ba.midikey2hz(84),t);

process(t) = sound(t);
