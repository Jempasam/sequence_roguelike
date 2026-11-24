declare name "monster_mage";
declare description "a monster turned into a card: a roar, an arcane flash";
declare duration "0.65";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");

v0(u) = voice.filter(sfx.voice.grunt(90), u);
v1(u) = voice.filter(\(u).(sfx.osc.fm(660,1.41,2)*sfx.env.decay(6,u)*sfx.env.attack(.02,u)), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.4615, v0, t) * 0.8
    +     sfx.sequence.part(0.3846, 1.0000, v1, t) * 0.4
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
