import { useState } from "react";
import {
  useGetDebugPlanPreview,
  useRunMockDay,
  useListDebugJobs,
  useListLocations,
  useGetIntegrationsStatus,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";

const WEATHER_SCENARIOS = [
  { value: "outdoor_good", label: "☀️ Outdoor Good" },
  { value: "outdoor_caution", label: "🌤 Outdoor Caution" },
  { value: "outdoor_blocked", label: "🌧 Outdoor Blocked" },
  { value: "extreme_heat", label: "🔥 Extreme Heat" },
  { value: "indoor_only", label: "🏠 Indoor Only" },
];

function ScoreBreakdown({ breakdown }: { breakdown: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(breakdown);
  if (entries.length === 0) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Score breakdown
      </button>
      {open && (
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 pl-4 text-xs text-muted-foreground border-l-2 border-border ml-1">
          {entries.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="text-slate-500">{k.replace(/_/g, " ")}</span>
              <span className={v < 0 ? "text-red-500 font-mono" : "text-emerald-600 font-mono"}>
                {v > 0 ? "+" : ""}{v}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Debug() {
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const [weatherScenario, setWeatherScenario] = useState<string | undefined>(undefined);

  const params = {
    ...(locationId ? { locationId } : {}),
    ...(weatherScenario ? { weatherOverride: weatherScenario } : {}),
  };

  const { data: preview, isLoading: previewLoading, refetch: refetchPreview } = useGetDebugPlanPreview(params);
  const { data: jobs, isLoading: jobsLoading } = useListDebugJobs();
  const { data: locations } = useListLocations();
  const { data: integrations } = useGetIntegrationsStatus();
  const runMockMutation = useRunMockDay();

  const handleRunMock = () => {
    runMockMutation.mutate(
      { data: { scenario: "typical_day", locationId, weatherOverride: weatherScenario } },
      { onSuccess: () => void refetchPreview() },
    );
  };

  const isMockMode = integrations?.mockMode ?? false;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-mono text-sm">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-sans text-primary">Debug Console</h1>
          <p className="text-muted-foreground mt-1 font-sans text-base">Raw planner output — not shown to Sharan.</p>
        </div>
        <Button onClick={handleRunMock} disabled={runMockMutation.isPending} variant="destructive">
          Run Mock Day
        </Button>
      </div>

      {isMockMode && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-amber-800 text-sm font-sans">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>MOCK MODE ACTIVE</strong> — Calendar, Weather, Telegram and LLM adapters are all
            simulated. No real integrations are connected.
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-sans">Location override</p>
          <Select value={locationId ?? "default"} onValueChange={(v) => setLocationId(v === "default" ? undefined : v)}>
            <SelectTrigger className="w-48 font-sans text-sm">
              <SelectValue placeholder="Default location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default location</SelectItem>
              {locations?.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-sans">Weather scenario</p>
          <Select value={weatherScenario ?? "default"} onValueChange={(v) => setWeatherScenario(v === "default" ? undefined : v)}>
            <SelectTrigger className="w-48 font-sans text-sm">
              <SelectValue placeholder="Current weather" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Current weather</SelectItem>
              {WEATHER_SCENARIOS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetchPreview()} className="font-sans">
          Refresh Preview
        </Button>
      </div>

      {previewLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : preview ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div className="rounded border p-3 bg-slate-50">
              <div className="text-slate-400 uppercase tracking-wider mb-1">Planner Mode</div>
              <Badge variant={preview.plannerMode === "llm_assisted" ? "default" : "secondary"}>
                {preview.plannerMode}
              </Badge>
            </div>
            <div className="rounded border p-3 bg-slate-50">
              <div className="text-slate-400 uppercase tracking-wider mb-1">Weather</div>
              <span className="font-semibold">{preview.weatherCondition}</span>
            </div>
            <div className="rounded border p-3 bg-slate-50">
              <div className="text-slate-400 uppercase tracking-wider mb-1">Location</div>
              <span className="font-semibold">{preview.locationLabel}</span>
            </div>
          </div>

          <Card className="bg-slate-900 text-slate-100 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-100 font-mono text-sm flex items-center gap-2">
                Selected Plan
                {preview.selected.caution && preview.selected.caution !== "none" && (
                  <Badge variant="outline" className="text-amber-400 border-amber-600 text-xs">
                    ⚠ {preview.selected.caution}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <div className="text-slate-400 uppercase tracking-wider mb-1">Morning Message</div>
                <div className="bg-slate-950 p-3 rounded text-emerald-400 leading-relaxed">
                  {preview.morningMessage}
                </div>
              </div>
              <div>
                <div className="text-slate-400 uppercase tracking-wider mb-1">Reasoning</div>
                <div className="text-slate-300 leading-relaxed">{preview.selected.reasoningSummary}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {[
                  { label: "Primary", id: preview.selected.primaryCandidateId },
                  { label: "Backup", id: preview.selected.backupCandidateId },
                  { label: "Min Win", id: preview.selected.minimumWinCandidateId },
                ].map(({ label, id }) => {
                  const c = preview.candidates.find((x) => x.id === id);
                  return (
                    <div key={label} className="rounded border border-slate-700 p-2">
                      <div className="text-slate-500 text-xs uppercase mb-1">{label}</div>
                      {c ? (
                        <>
                          <div className="text-slate-200 font-semibold">{c.activityName}</div>
                          <div className="text-slate-400 text-xs">{c.role} · score {c.score}</div>
                        </>
                      ) : (
                        <div className="text-slate-600">—</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Passing Candidates
                <Badge variant="secondary">{preview.candidates.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {preview.candidates.map((c) => {
                  const isSelected =
                    c.id === preview.selected.primaryCandidateId ||
                    c.id === preview.selected.backupCandidateId ||
                    c.id === preview.selected.minimumWinCandidateId;
                  return (
                    <div
                      key={c.id}
                      className={`p-3 border rounded ${isSelected ? "border-primary/40 bg-primary/5" : "bg-secondary/30"}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">
                          {c.activityName}
                          {isSelected && (
                            <Badge variant="default" className="ml-2 text-xs py-0">selected</Badge>
                          )}
                        </span>
                        <Badge variant="secondary" className="font-mono">
                          {c.score}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                        <span>role: {c.role}</span>
                        <span>loc: {c.locationLabel}</span>
                        <span>{new Date(c.windowStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {new Date(c.windowEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <ScoreBreakdown breakdown={c.scoreBreakdown as Record<string, number>} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Rejected Candidates
                <Badge variant="destructive">{preview.rejected.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {preview.rejected.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rejections.</p>
              ) : (
                <div className="space-y-3">
                  {preview.rejected.map((c) => (
                    <div key={c.id} className="p-3 border border-red-100 rounded bg-red-50/50">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-red-800">{c.activityName}</span>
                        <Badge variant="destructive" className="text-xs">rejected</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        role: {c.role} · loc: {c.locationLabel}
                      </div>
                      <ul className="mt-2 space-y-1">
                        {c.rejectionReasons.map((r, i) => (
                          <li key={i} className="text-xs text-red-700 flex items-start gap-1">
                            <span className="mt-0.5 flex-shrink-0">→</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground font-sans">
            No preview available. Click <strong>Refresh Preview</strong> to generate.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-sans">Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          {integrations ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["calendar", "weather", "telegram", "llm"] as const).map((key) => {
                const s = integrations[key];
                return (
                  <div key={key} className="rounded border p-2 text-center">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{key}</div>
                    {s.mock ? (
                      <Badge variant="secondary" className="text-xs">mock</Badge>
                    ) : s.connected ? (
                      <Badge variant="default" className="text-xs bg-emerald-600">live</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">disconnected</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Skeleton className="h-16" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-sans">Background Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <div className="space-y-2">
              {jobs?.map((job) => (
                <div key={job.id} className="flex justify-between items-center p-2 border-b last:border-0">
                  <div>
                    <div className="font-bold">{job.jobType}</div>
                    <div className="text-xs text-muted-foreground">{job.status}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Due: {new Date(job.dueAt).toLocaleString()}
                  </div>
                </div>
              ))}
              {(!jobs || jobs.length === 0) && (
                <div className="text-muted-foreground font-sans text-sm">No active jobs.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
