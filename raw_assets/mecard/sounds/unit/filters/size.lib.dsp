declare name "size";
declare description "the size of what speaks: the larger, the duller and the more the room rings";

import("sfx.lib");

filter(k, s, t) = s(t) : sfx.filter.lpf(max(900, 9000 / (k * k)), 0.7) : sfx.fx.reverb(0.3 + 0.25 * k, 0.1 + 0.1 * k);
