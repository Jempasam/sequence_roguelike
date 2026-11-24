declare name "dark_magician";
declare description "a card given: a low drum roll, then a falling minor harp";
declare duration "1.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");
rumble_120 = library("../lib/halt_voices/rumble_120.lib.dsp");

v0(u) = voice.filter(\(u).((sfx.sequence.euclid(8,8,0,sfx.perc.tom(90),u)) * (.25 + .75 * u)), u);
v1(u) = voice.filter(sfx.sequence.arp4(ba.midikey2hz(76),ba.midikey2hz(72),ba.midikey2hz(69),ba.midikey2hz(64),sfx.inst.pluck), u);
v2(u) = voice.filter(rumble_120.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.6
    + sfx.sequence.part(0.5, 0.9444, v1, t) * 0.5
    + sfx.sequence.part(0, 1, v2, t) * 0.25
);

sound(t) = category.filter(mix, t) * 0.5559;

process(t) = sound(t);
