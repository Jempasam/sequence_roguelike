declare name "pluck_72";
declare description "a voice shared by the halts: sfx.inst.pluck(ba.midikey2hz(72),u)";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.inst.pluck(ba.midikey2hz(72),t);

process(t) = sound(t);
