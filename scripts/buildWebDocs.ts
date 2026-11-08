// Builds the web version into docs/ (to be served as is, e.g. by GitHub Pages).
import { spawnSync } from "node:child_process"

const result = spawnSync("npm run web:build", {
    shell: true,
    stdio: "inherit",
    env: { ...process.env, WEB_OUT_DIR: "docs" },
})
process.exit(result.status ?? 1)
