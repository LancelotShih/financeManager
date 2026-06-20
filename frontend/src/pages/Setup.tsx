import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, ExternalLink, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/api/client";

export default function Setup() {
  const [cookieText, setCookieText] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["auth-status"],
    queryFn: () => api.auth.status(),
    staleTime: 30_000,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.auth.uploadFile(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-status"] });
      qc.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });

  const pasteMutation = useMutation({
    mutationFn: (c: string) => api.auth.setCookies(c),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth-status"] });
      qc.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });

  const handleFile = (file: File) => {
    uploadMutation.reset();
    pasteMutation.reset();
    uploadMutation.mutate(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const result = uploadMutation.data ?? pasteMutation.data;
  const isPending = uploadMutation.isPending || pasteMutation.isPending;

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Setup</h1>
        <p className="text-text-secondary text-sm mt-1">
          Connect your Yahoo Finance account using your browser cookies.
        </p>
      </div>

      {/* Connection status */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${
        status?.authenticated ? "bg-gain/10 border-gain/30" : "bg-loss/10 border-loss/30"
      }`}>
        {status?.authenticated
          ? <CheckCircle2 className="w-5 h-5 text-gain-light flex-shrink-0" />
          : <XCircle className="w-5 h-5 text-loss-light flex-shrink-0" />}
        <div>
          <p className="text-text-primary text-sm font-medium">
            {status?.authenticated ? "Connected" : "Not connected"}
          </p>
          <p className="text-text-secondary text-xs">{status?.message}</p>
        </div>
      </div>

      {/* Primary method: file */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Upload cookies.json</h2>
          <p className="text-text-secondary text-xs mt-0.5">
            Export from the{" "}
            <a
              href="https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm"
              target="_blank" rel="noopener noreferrer"
              className="text-accent-purple hover:underline inline-flex items-center gap-0.5"
            >
              Cookie Editor extension <ExternalLink className="w-3 h-3" />
            </a>
            {" "}while on finance.yahoo.com, save the file, then upload it here.
            Or drop <code className="bg-bg-secondary px-1 rounded">cookies.json</code> directly
            into the <code className="bg-bg-secondary px-1 rounded">backend/</code> folder and restart the server.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            dragOver
              ? "border-accent-purple bg-accent-purple/10"
              : "border-border hover:border-text-muted hover:bg-bg-hover"
          }`}
        >
          <Upload className="w-7 h-7 text-text-muted" />
          <p className="text-text-secondary text-sm">
            Drop <strong className="text-text-primary">cookies.json</strong> here or{" "}
            <span className="text-accent-purple">click to browse</span>
          </p>
          <p className="text-text-muted text-xs">JSON export from Cookie Editor</p>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* How to use Cookie Editor */}
        <div className="bg-bg-card border border-border rounded-lg p-4 text-xs text-text-secondary space-y-1.5">
          <p className="font-medium text-text-primary text-sm">How to export with Cookie Editor</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Install Cookie Editor and open <a href="https://finance.yahoo.com/portfolios" target="_blank" rel="noopener noreferrer" className="text-accent-purple hover:underline">finance.yahoo.com/portfolios</a> while logged in.</li>
            <li>Click the Cookie Editor icon in your toolbar.</li>
            <li>Click <strong className="text-text-primary">Export</strong> (bottom of the popup) → <strong className="text-text-primary">Export as JSON</strong> — this copies to clipboard.</li>
            <li>Open a text editor, paste, and save as <code className="bg-bg-secondary px-1 rounded">cookies.json</code>.</li>
            <li>Upload the file using the drop zone above.</li>
          </ol>
        </div>

        {/* Upload result */}
        {result && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
            result.authenticated ? "bg-gain/10 text-gain-light" : "bg-loss/10 text-loss-light"
          }`}>
            {result.authenticated ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {result.message}
          </div>
        )}

        {isPending && (
          <p className="text-text-muted text-sm text-center">Verifying cookies…</p>
        )}
      </div>

      <hr className="border-border" />

      {/* Manual fallback */}
      <div>
        <button
          onClick={() => setShowManual(!showManual)}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          {showManual ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Paste cookies manually (fallback)
        </button>

        {showManual && (
          <div className="mt-3 space-y-3">
            <p className="text-text-muted text-xs">
              Paste the raw cookie string or full cURL command. Note: <code className="bg-bg-secondary px-1 rounded">document.cookie</code> and
              the Application tab won't work — they hide HttpOnly cookies.
            </p>
            <textarea
              value={cookieText}
              onChange={(e) => setCookieText(e.target.value)}
              placeholder="A1=d=AQABB...; A3=d=AQABB...; GUC=AQE...  — or paste full cURL command"
              rows={5}
              className="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-text-primary text-sm font-mono placeholder:text-text-muted focus:outline-none focus:border-accent-purple resize-none"
            />
            <button
              disabled={!cookieText.trim() || isPending}
              onClick={() => pasteMutation.mutate(cookieText.trim())}
              className="w-full py-2.5 bg-accent-purple text-white rounded-lg font-medium text-sm hover:bg-accent-purple/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pasteMutation.isPending ? "Verifying…" : "Save & Connect"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
