import { memo } from "react";
import type { Attachment } from "../../types";

interface Props {
  attachment: Attachment;
  onRemove: (id: string) => void;
}

/** File type icon based on extension. */
function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "\uD83D\uDDBC";
  if (["csv", "xlsx", "xls", "tsv", "json"].includes(ext)) return "\uD83D\uDCCA";
  if (["zip", "tar", "gz", "7z", "rar"].includes(ext)) return "\uD83D\uDCE6";
  return "\uD83D\uDCC4";
}

export default memo(function AttachmentChip({ attachment, onRemove }: Props) {
  const truncatedName = attachment.name.length > 20
    ? attachment.name.slice(0, 17) + "..."
    : attachment.name;

  return (
    <div className="attachment-chip" title={attachment.path}>
      {attachment.thumbnail ? (
        <img src={attachment.thumbnail} alt="" className="attachment-thumb" />
      ) : (
        <span className="attachment-icon">{fileIcon(attachment.name)}</span>
      )}
      <span className="attachment-name">{truncatedName}</span>
      <button
        className="attachment-remove"
        onClick={() => onRemove(attachment.id)}
        aria-label={`Remove ${attachment.name}`}
      >
        x
      </button>
    </div>
  );
});
