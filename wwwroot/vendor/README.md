# Browser libraries shipped with NexusAI

These files are local copies of npm packages explicitly approved for this project:

| Package | Pinned version | Browser distribution | License |
|---|---|---|---|
| marked | 18.2.1 | `marked/marked.umd.js` | MIT |
| dompurify | 3.4.18 | `dompurify/purify.min.js` | Apache-2.0 OR MPL-2.0 |
| fuse.js | 7.1.0 | `fuse.js/fuse.min.js` | Apache-2.0 |

Each directory includes its upstream license and `version.json`. Fuse 7.1.0 is pinned for its classic browser distribution: it works with the existing deferred scripts, without ESM/file-origin restrictions or adding a bundler.

Do not edit the distributions by hand. `npm ci` runs `scripts/sync-vendor.cjs` after installation. To resync explicitly, run `npm run vendor:sync`. Update the package lock, sync files, preserve licenses, run the full browser/security tests and check `npm audit` when upgrading. Keep these browser files in the deployed `wwwroot`; the server/browser does not need Node or npm to run them.

Marked only parses Markdown; it does not sanitize HTML. NexusAI passes its output through a restricted DOMPurify policy before inserting a DOM fragment. Raw HTML is escaped, remote images are not rendered, and unsupported link protocols are removed. If either parser or sanitizer is missing, messages are displayed as plain text. User messages and FAQ table cells remain plain text.

Fuse performs local approximate text matching, not semantic search or AI generation. It does not send FAQ queries to a remote search service.
