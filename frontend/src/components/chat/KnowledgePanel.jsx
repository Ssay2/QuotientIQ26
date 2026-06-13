import React, { useState } from "react";
import { FileText, Trash2, Upload, Link as LinkIcon, ClipboardPaste, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { toast } from "sonner";

const TABS = [
  { id: "file", label: "File", icon: Upload },
  { id: "text", label: "Paste", icon: ClipboardPaste },
  { id: "url", label: "URL", icon: Globe },
];

function FileTab({ uploading, fileInputRef, onPickFile, onFileChange }) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.csv"
        onChange={onFileChange}
        className="hidden"
        data-testid="file-input"
      />
      <Button
        data-testid="upload-pdf-btn"
        onClick={onPickFile}
        disabled={uploading}
        variant="outline"
        className="w-full border-dashed border-border h-20 flex-col gap-1"
      >
        <Upload className="size-4" strokeWidth={1.5} />
        <span className="text-xs">{uploading ? "Indexing…" : "Upload PDF / DOCX / TXT"}</span>
      </Button>
    </>
  );
}

function TextTab({ agentId, onIngested }) {
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/agents/${agentId}/ingest-text`, { label: label || "Pasted text", text });
      toast.success(`Indexed (${data.chars} chars)`);
      setText("");
      setLabel("");
      onIngested();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Ingest failed");
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <Input data-testid="ingest-text-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. FAQ)" className="h-9 border-border rounded-md text-xs" />
      <Textarea data-testid="ingest-text-area" value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste FAQs, policies, snippets…" className="resize-none border-border rounded-md text-xs font-mono" />
      <Button data-testid="ingest-text-submit" onClick={submit} disabled={busy || !text.trim()} variant="outline" size="sm" className="w-full border-border gap-2">
        <ClipboardPaste className="size-3.5" strokeWidth={1.5} /> {busy ? "Indexing…" : "Add to memory"}
      </Button>
    </div>
  );
}

function UrlTab({ agentId, onIngested }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/agents/${agentId}/ingest-url`, { url });
      toast.success(`Crawled (${data.chars} chars)`);
      setUrl("");
      onIngested();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Crawl failed");
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-2">
      <Input data-testid="ingest-url-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yoursite.com/help" className="h-9 border-border rounded-md text-xs font-mono" />
      <Button data-testid="ingest-url-submit" onClick={submit} disabled={busy || !url.trim()} variant="outline" size="sm" className="w-full border-border gap-2">
        <LinkIcon className="size-3.5" strokeWidth={1.5} /> {busy ? "Crawling…" : "Crawl URL"}
      </Button>
    </div>
  );
}

export function KnowledgePanel({ agentId, files, uploading, fileInputRef, onPickFile, onFileChange, onRemoveFile, onRefresh }) {
  const [active, setActive] = useState("file");

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">// knowledge base</div>

      <div className="flex gap-px bg-border border border-border mb-3" data-testid="ingest-tabs">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            data-testid={`ingest-tab-${id}`}
            onClick={() => setActive(id)}
            className={`flex-1 px-3 py-2 text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-1.5 ${
              active === id ? "bg-black text-white" : "bg-white text-foreground/70 hover:bg-muted/40"
            }`}
          >
            <Icon className="size-3" strokeWidth={1.5} /> {label}
          </button>
        ))}
      </div>

      {active === "file" && <FileTab uploading={uploading} fileInputRef={fileInputRef} onPickFile={onPickFile} onFileChange={onFileChange} />}
      {active === "text" && <TextTab agentId={agentId} onIngested={onRefresh} />}
      {active === "url" && <UrlTab agentId={agentId} onIngested={onRefresh} />}

      <div className="mt-3 space-y-1.5" data-testid="kb-files">
        {files.length === 0 && (
          <div className="text-xs text-muted-foreground font-mono">No documents yet.</div>
        )}
        {files.map((f) => (
          <div key={f.name} className="flex items-center justify-between gap-2 p-2 border border-border bg-white text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="size-3.5 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <span className="truncate" title={f.name}>{f.name}</span>
              {f.kind && <span className="font-mono text-[9px] uppercase text-muted-foreground/60 shrink-0">{f.kind}</span>}
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
