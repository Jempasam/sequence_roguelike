declare name "slime";
declare description "gooey sounds: a blorp that rises and a burble";

import("sfx.lib");

blorp(f, u) = sfx.fire.plop(f, u) * 1.4 + sfx.water.bubble(f * 1.5, u) * 0.6;
burble(u) = sfx.water.bubbling(8, 2, u);
