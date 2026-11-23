declare name "soapy";
declare description "two small bubbles";
declare duration "0.3";

import("sfx.lib");

process(t) = (sfx.nature.drip(min(t * 2, 1)) * (t < 0.5) + sfx.nature.drip(max(t * 2 - 1, 0)) * (t >= 0.5)) * 0.4;
