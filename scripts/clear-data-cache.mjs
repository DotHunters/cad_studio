// Removes Next's persisted data cache (unstable_cache entries) so every e2e run starts from
// the database, not from pages cached by an earlier run.
import { rmSync } from "node:fs";

rmSync(`${process.env.NEXT_DIST_DIR || ".next"}/cache/fetch-cache`, {
  recursive: true,
  force: true,
});
