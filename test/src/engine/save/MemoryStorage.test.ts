import { MemoryStorage } from "@game/core-src/engine/save/MemoryStorage"

import { describeStorageContract } from "../../fixtures/storageContract"

describeStorageContract("MemoryStorage", () => new MemoryStorage())
