declare name "human";
declare description "the voice of a fighter: a battle cry, a deep cry, a breath of effort, a laugh";

import("sfx.lib");

cry(f, u) = sfx.voice.say(0, 0, sfx.env.sweep(f * 1.25, f * 0.8, u), u);
deep_cry(f, u) = sfx.voice.deep_say(0, 4, sfx.env.sweep(f * 1.25, f * 0.8, u), u);
old_cry(f, u) = sfx.voice.elder_say(0, 4, sfx.env.sweep(f * 1.15, f * 0.8, u), u);
hah(f, u) = sfx.voice.say(17, 0, sfx.env.sweep(f * 1.3, f, u), u);
effort(f, u) = sfx.voice.grunt(f, u) * 0.8 + sfx.voice.say(17, 4, f, u) * 0.4;
laugh(f, u) = sfx.voice.word_haha(f, u);
