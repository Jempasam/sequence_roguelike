declare name "alchemist";
declare description "two upgraded copies: the potion bubbles, a glass note per copy";
declare duration "0.95";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
bell_84 = library("../lib/halt_voices/bell_84.lib.dsp");
bubble_450 = library("../lib/halt_voices/bubble_450.lib.dsp");

v0(u) = voice.filter(bubble_450.sound, u);
v1(u) = voice.filter(bubble_450.sound, u);
v2(u) = voice.filter(bubble_450.sound, u);
v3(u) = voice.filter(bubble_450.sound, u);
v4(u) = voice.filter(bell_84.sound, u);
v5(u) = voice.filter(bell_84.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.1263, v0, t) * 0.5
    +     sfx.sequence.part(0.1053, 0.2316, v1, t) * 0.5
    +     sfx.sequence.part(0.2105, 0.3368, v2, t) * 0.5
    +     sfx.sequence.part(0.3158, 0.4421, v3, t) * 0.5
    +     sfx.sequence.part(0.4737, 0.8421, v4, t) * 0.6
    +     sfx.sequence.part(0.6316, 1.0000, v5, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
