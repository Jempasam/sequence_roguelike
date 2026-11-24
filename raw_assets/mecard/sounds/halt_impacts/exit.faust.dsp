declare name "exit";
declare description "the floor entered: steps, then the door opening";
declare duration "0.85";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
creak = library("../lib/halt_voices/creak.lib.dsp");

v0(u) = voice.filter(sfx.nature.footstep(3), u);
v1(u) = voice.filter(sfx.nature.footstep(4), u);
v2(u) = voice.filter(creak.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.1765, v0, t) * 0.8
    +     sfx.sequence.part(0.1765, 0.3529, v1, t) * 0.8
    +     sfx.sequence.part(0.3529, 1.0000, v2, t) * 0.7
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
