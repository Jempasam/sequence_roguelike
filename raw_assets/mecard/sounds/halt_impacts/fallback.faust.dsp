declare name "fallback";
declare description "a halt with no sound of its own: a plain confirmation";
declare duration "0.3";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
confirm = library("../lib/halt_voices/confirm.lib.dsp");

v0(u) = voice.filter(confirm.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 1.0000, v0, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
