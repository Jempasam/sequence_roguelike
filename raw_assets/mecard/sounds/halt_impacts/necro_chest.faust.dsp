declare name "necro_chest";
declare description "a cursed card given: slow creak, bones falling";
declare duration "0.85";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
creak = library("../lib/halt_voices/creak.lib.dsp");

v0(u) = voice.filter(creak.sound, u);
v1(u) = voice.filter(sfx.impact.wood(700,.9), u);
v2(u) = voice.filter(sfx.impact.wood(700,.9), u);
v3(u) = voice.filter(sfx.impact.wood(700,.9), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.6471, v0, t) * 0.8
    +     sfx.sequence.part(0.3529, 0.4706, v1, t) * 0.6
    +     sfx.sequence.part(0.4706, 0.5882, v2, t) * 0.6
    +     sfx.sequence.part(0.5882, 0.7059, v3, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
