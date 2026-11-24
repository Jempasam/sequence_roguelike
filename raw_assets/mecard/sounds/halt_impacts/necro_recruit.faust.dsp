declare name "necro_recruit";
declare description "a monster joins: earth splitting, bones assembling";
declare duration "0.65";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
wood_900 = library("../lib/halt_voices/wood_900.lib.dsp");

v0(u) = voice.filter(\(u).(sfx.noise.brown*sfx.env.fadeio(.2,.5,u)*.4), u);
v1(u) = voice.filter(wood_900.sound, u);
v2(u) = voice.filter(wood_900.sound, u);
v3(u) = voice.filter(wood_900.sound, u);
v4(u) = voice.filter(wood_900.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.4615, v0, t) * 0.6
    +     sfx.sequence.part(0.3077, 0.4615, v1, t) * 0.6
    +     sfx.sequence.part(0.4615, 0.6154, v2, t) * 0.6
    +     sfx.sequence.part(0.6154, 0.7692, v3, t) * 0.6
    +     sfx.sequence.part(0.7692, 0.9231, v4, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
