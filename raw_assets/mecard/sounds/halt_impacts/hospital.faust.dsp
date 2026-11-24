declare name "hospital";
declare description "hearts restored: the monitor beep, life coming back";
declare duration "0.85";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
beep_880 = library("../lib/halt_voices/beep_880.lib.dsp");

v0(u) = voice.filter(beep_880.sound, u);
v1(u) = voice.filter(\(u).((sfx.inst.bell(ba.midikey2hz(72),u)+sfx.inst.bell(ba.midikey2hz(76),u)+sfx.inst.bell(ba.midikey2hz(79),u))*.5), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.2353, v0, t) * 0.5
    +     sfx.sequence.part(0.2941, 1.0000, v1, t) * 0.7
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
