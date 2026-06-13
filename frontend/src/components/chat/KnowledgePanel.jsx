import React from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function KnowledgePanel({ files, uploading, onPickFile, onRemoveFile, fileInputRef, onFileChange }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// knowledge base</div>
      <input ref={fileInputRef} type="file" accept="application/pdf" onChange={onFileChange} className="hidden" data-testid="file-input" />
      <Button
        data-testid="upload-pdf-btn"
        onClick={onPickFile}
        disabled={uploading}
        variant="outline"
        className="w-full border-dashed border-border h-20 flex-col gap-1"
      >
        <Upload className="size-4" strokeWidth={1.5} />
        <span className="text-xs">{uploading ? "Indexing…" : "Upload PDF"}</span>
      </Button>
      <div className="mt-3 space-y-1.5" data-testid="kb-files">
        {files.length === 0 && (
          <div className="text-xs text-muted-foreground font-mono">No documents yet.</div>
        )}
        {files.map((f) => (
          <div key={f.name} className="flex items-center justify-between gap-2 p-2 border border-border bg-white text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="size-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <span className="truncate" title={f.name}>{f.name}</span>
            </div>
            <button
              data-testid={`delete-file-${f.name}`}
              onClick={() => onRemoveFile(f.name)}
              className="text-muted-foreground hover:text-destructive shrink-0"
              aria-label={`Remove ${f.name}`}
            >
              <Trash2 className="size-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
