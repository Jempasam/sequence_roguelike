declare name "goblin";
declare description "the cackle of a goblin: a short nonsense speech, high and nasal, with a squeak";

import("sfx.lib");

cackle(seed, f, u) = sfx.voice.babble(5, seed, f, 5, u) * 0.9 + sfx.voice.squeak(f * 1.4, u) * 0.4 * sfx.env.decay(4, u);
