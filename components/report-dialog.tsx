"use client";

import { useState } from "react";
import { Download, Loader2, Sparkles, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { toLocalDateStr } from "@/lib/utils";
import { generateReportPDF, type AIAnalysis, type RawData } from "@/lib/pdf-report";

type Preset = "1day" | "7days" | "15days" | "30days" | "custom";
type Language = "en" | "nl";

const presetLabels: Record<Preset, string> = {
  "1day": "Last 1 Day",
  "7days": "Last 7 Days",
  "15days": "Last 15 Days",
  "30days": "This Month",
  custom: "Custom Range",
};

export function ReportDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
}) {
  const [preset, setPreset] = useState<Preset>("7days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [language, setLanguage] = useState<Language>("en");
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  function getDateRange(p: Preset): { start: string; end: string } {
    const today = new Date();
    const end = toLocalDateStr(today);

    if (p === "1day") return { start: end, end };
    if (p === "7days") {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start: toLocalDateStr(start), end };
    }
    if (p === "15days") {
      const start = new Date(today);
      start.setDate(start.getDate() - 14);
      return { start: toLocalDateStr(start), end };
    }
    if (p === "30days") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: toLocalDateStr(start), end };
    }
    return { start: startDate, end: endDate };
  }

  async function handleDownload() {
    setError(null);
    const { start, end } = getDateRange(preset);

    if (preset === "custom" && (!start || !end)) {
      setError("Please select both start and end dates.");
      return;
    }
    if (start && end && start > end) {
      setError("Start date must be before end date.");
      return;
    }

    setGenerating(true);
    try {
      // Step 1: Fetch data + AI analysis
      setStatus("Fetching activity data...");
      const res = await fetch("/api/report-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          employeeName,
          startDate: start,
          endDate: end,
          language,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate report");
      }

      setStatus("AI is analyzing the data...");
      const data = await res.json();

      const analysis: AIAnalysis = data.analysis;
      const rawData: RawData = data.rawData;

      // Step 2: Generate PDF
      setStatus("Generating PDF report...");
      await generateReportPDF(analysis, rawData, language);

      setStatus("");
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate report.");
      setStatus("");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Report</DialogTitle>
          <DialogDescription>
            AI-powered activity report for {employeeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Period selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Select Period
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(presetLabels) as Preset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  disabled={generating}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    preset === p
                      ? "border-[rgba(124,92,255,0.5)] bg-[rgba(124,92,255,0.15)] text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {presetLabels[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date range */}
          {preset === "custom" && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" className="w-full justify-start" disabled={generating}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate
                          ? new Date(startDate + "T00:00:00").toLocaleDateString("en-US", {
                              weekday: "short", month: "short", day: "numeric", year: "numeric",
                            })
                          : "Pick start date"}
                        <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate ? new Date(startDate + "T00:00:00") : undefined}
                      onSelect={(date) => { if (date) setStartDate(toLocalDateStr(date)); }}
                      disabled={{ after: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button variant="outline" className="w-full justify-start" disabled={generating}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate
                          ? new Date(endDate + "T00:00:00").toLocaleDateString("en-US", {
                              weekday: "short", month: "short", day: "numeric", year: "numeric",
                            })
                          : "Pick end date"}
                        <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate ? new Date(endDate + "T00:00:00") : undefined}
                      onSelect={(date) => { if (date) setEndDate(toLocalDateStr(date)); }}
                      disabled={{ after: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Language selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              <Globe className="mr-1.5 inline h-4 w-4" />
              Report Language
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLanguage("en")}
                disabled={generating}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  language === "en"
                    ? "border-[rgba(124,92,255,0.5)] bg-[rgba(124,92,255,0.15)] text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("nl")}
                disabled={generating}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                  language === "nl"
                    ? "border-[rgba(124,92,255,0.5)] bg-[rgba(124,92,255,0.15)] text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                Nederlands (Dutch)
              </button>
            </div>
          </div>

          {/* Preview of selected range */}
          {preset !== "custom" && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {(() => {
                const { start, end } = getDateRange(preset);
                return start === end
                  ? `Report for: ${start}`
                  : `Report from ${start} to ${end}`;
              })()}
            </div>
          )}

          {/* Status */}
          {generating && status && (
            <div className="flex items-center gap-2 rounded-lg border border-[rgba(124,92,255,0.2)] bg-[rgba(124,92,255,0.08)] p-3 text-sm text-foreground">
              <Sparkles className="h-4 w-4 animate-pulse text-[#a855f7]" />
              {status}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleDownload}
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
