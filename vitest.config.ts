import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        projects: ["core", "web", "desktop", "server", "test"],
        passWithNoTests: true,
    },
})
