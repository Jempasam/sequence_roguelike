declare name "pluck_67";
declare description "a voice shared by the halts: sfx.inst.pluck(ba.midikey2hz(67),u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.inst.pluck(ba.midikey2hz(67),t);

process(t) = sound(t);
