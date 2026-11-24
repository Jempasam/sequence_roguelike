declare name "great_forge";
declare description "two or three cards welded: big fire, a blow per card, the quench";
declare duration "2.4";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/workshop.lib.dsp");

v0(u) = voice.filter(sfx.fire.roar, u);
v1(u) = voice.filter(sfx.impact.metal(250,0.9), u);
v2(u) = voice.filter(sfx.impact.metal(250,0.9), u);
v3(u) = voice.filter(sfx.impact.metal(250,0.9), u);
v4(u) = voice.filter(\(u).((sfx.fire.sizzle(u) * sfx.env.decay(3,u) * sfx.env.attack(.05,u) + sfx.nature.splash(u))), u);

mix(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.4
    + sfx.sequence.part(0.125, 0.2917, v1, t) * 0.7
    + sfx.sequence.part(0.2917, 0.4583, v2, t) * 0.7
    + sfx.sequence.part(0.4583, 0.625, v3, t) * 0.7
    + sfx.sequence.part(0.5833, 1, v4, t) * 0.7
);

sound(t) = category.filter(mix, t) * 1.5668;

process(t) = sound(t);
