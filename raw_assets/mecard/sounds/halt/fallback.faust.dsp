declare name "fallback";
declare description "a halt with no sound of its own: a plain confirmation";
declare duration "1";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");
confirm = library("../lib/halt_voices/confirm.lib.dsp");
pluck_72 = library("../lib/halt_voices/pluck_72.lib.dsp");

v0(u) = voice.filter(confirm.sound, u);
v1(u) = voice.filter(pluck_72.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.3, v0, t) * 0.6
    + sfx.sequence.part(0.1, 0.9, v1, t) * 0.4
);

sound(t) = category.filter(mix, t) * 1.7989;

process(t) = sound(t);
