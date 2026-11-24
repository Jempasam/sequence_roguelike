declare name "master_chest";
declare description "rare cards given: combination lock, vault, gems";
declare duration "1.25";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
click_04 = library("../lib/halt_voices/click_04.lib.dsp");

v0(u) = voice.filter(click_04.sound, u);
v1(u) = voice.filter(click_04.sound, u);
v2(u) = voice.filter(click_04.sound, u);
v3(u) = voice.filter(sfx.impact.stone(120,.8), u);
v4(u) = voice.filter(\(u).(sfx.osc.fm(3000,1.41,1)*sfx.env.decay(7,u)*sfx.env.attack(.02,u)), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.0800, v0, t) * 0.5
    +     sfx.sequence.part(0.1200, 0.2000, v1, t) * 0.5
    +     sfx.sequence.part(0.2400, 0.3200, v2, t) * 0.5
    +     sfx.sequence.part(0.3600, 0.6000, v3, t) * 0.8
    +     sfx.sequence.part(0.4800, 1.0000, v4, t) * 0.3
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
