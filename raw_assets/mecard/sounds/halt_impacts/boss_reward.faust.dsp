declare name "boss_reward";
declare description "a boss prize taken: a drum, a pile of gold, a triumphant fanfare";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");
lead_67 = library("../lib/halt_voices/lead_67.lib.dsp");
lead_72 = library("../lib/halt_voices/lead_72.lib.dsp");

v0(u) = voice.filter(sfx.perc.tom(70), u);
v1(u) = voice.filter(coin.sound, u);
v2(u) = voice.filter(coin.sound, u);
v3(u) = voice.filter(coin.sound, u);
v4(u) = voice.filter(coin.sound, u);
v5(u) = voice.filter(coin.sound, u);
v6(u) = voice.filter(coin.sound, u);
v7(u) = voice.filter(coin.sound, u);
v8(u) = voice.filter(coin.sound, u);
v9(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(60)), u);
v10(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(64)), u);
v11(u) = voice.filter(lead_67.sound, u);
v12(u) = voice.filter(lead_72.sound, u);
v13(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(76)), u);
v14(u) = voice.filter(sfx.voice.monks(98), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.1563, v0, t) * 0.8
    +     sfx.sequence.part(0.0625, 0.1875, v1, t) * 0.4
    +     sfx.sequence.part(0.0969, 0.2219, v2, t) * 0.4
    +     sfx.sequence.part(0.1312, 0.2562, v3, t) * 0.4
    +     sfx.sequence.part(0.1656, 0.2906, v4, t) * 0.4
    +     sfx.sequence.part(0.2000, 0.3250, v5, t) * 0.4
    +     sfx.sequence.part(0.2344, 0.3594, v6, t) * 0.4
    +     sfx.sequence.part(0.2687, 0.3937, v7, t) * 0.4
    +     sfx.sequence.part(0.3031, 0.4281, v8, t) * 0.4
    +     sfx.sequence.part(0.3125, 0.6250, v9, t) * 0.6
    +     sfx.sequence.part(0.3750, 0.6875, v10, t) * 0.6
    +     sfx.sequence.part(0.4375, 0.7500, v11, t) * 0.6
    +     sfx.sequence.part(0.5000, 0.8125, v12, t) * 0.6
    +     sfx.sequence.part(0.5625, 0.8750, v13, t) * 0.6
    +     sfx.sequence.part(0.3125, 1.0000, v14, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
