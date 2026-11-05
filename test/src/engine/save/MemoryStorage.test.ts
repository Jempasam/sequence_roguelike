import { MemoryStorage } from "@game/core"

import { describeStorageContract } from "../../fixtures/storageContract"

describeStorageContract("MemoryStorage", () => new MemoryStorage())
