// The header's sign of a new version of the site, ready in the service
// worker's cache: a click reloads the page with it (lib/update.ts)
import { RefreshCw } from "lucide-react";
import { update, useUpdate } from "../../lib/update";

export function UpdateBadge({ compact }: { compact?: boolean }) {
  if (!useUpdate()) return null;
  return (
    <button
      className="update-badge"
      onClick={update}
      aria-label="New version"
      title="A new version of the site is ready: reload the page to use it"
    >
      <RefreshCw size={13} />
      {!compact && " New version · Reload"}
    </button>
  );
}
