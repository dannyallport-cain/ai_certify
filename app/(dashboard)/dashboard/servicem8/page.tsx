"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Briefcase,
  CheckCircle2,
  Loader2,
  Plug,
  RefreshCw,
  Unplug,
  Users,
  XCircle,
} from "lucide-react";
import useSWR, { mutate } from "swr";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceM8DataTable, type TableOption } from "@/components/servicem8-data-table";
import { getMissingServiceM8ClientFields } from "@/lib/servicem8/client-mapping";
import type { ServiceM8JobPickerRecord } from "@/lib/servicem8/picker";
import type { ServiceM8ClientRecord } from "@/lib/servicem8/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ConnectionData {
  connected: boolean;
  connection?: {
    id: number;
    isActive: boolean;
    servicem8CompanyName: string;
    syncEnabled: boolean;
    syncDirection: string;
    lastSyncAt: string | null;
    createdAt: string;
    updatedAt: string;
    /** Scopes the connection was asked for but was not granted. */
    missingScopes: string[];
    reconnectRequired: boolean;
    reconnectReason: string | null;
  };
}

/**
 * Both endpoints return the raw ServiceM8 record merged with its normalised
 * form, so the UI types come straight from the modules that build them. The
 * previous hand-written interfaces listed Company fields ServiceM8 never
 * returns (`company_name`, `billing_city`, ...), which is why several columns
 * rendered blank even though the data existed on CompanyContact.
 */
type SM8Job = ServiceM8JobPickerRecord;
type SM8Client = ServiceM8ClientRecord;

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  total: number;
  /** Imported clients that ServiceM8 holds no email, phone or mobile for. */
  importedWithGaps: number;
  warnings: string[];
}

const PENDING_SERVICE_M8_ACTION_KEY = "ai_certify_servicem8_pending_action";

type PendingServiceM8Action = "import_clients";

function getPendingServiceM8Action(): PendingServiceM8Action | null {
  if (typeof window === "undefined") {
    return null;
  }

  const action = window.sessionStorage.getItem(PENDING_SERVICE_M8_ACTION_KEY);
  return action === "import_clients" ? action : null;
}

function setPendingServiceM8Action(action: PendingServiceM8Action) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PENDING_SERVICE_M8_ACTION_KEY, action);
}

function clearPendingServiceM8Action() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_SERVICE_M8_ACTION_KEY);
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "-";
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never";
}

function formatContactName(firstName: string | null, lastName: string | null) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "-";
}

function formatAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ") || "-";
}

function getJobStatusClass(status: string | null) {
  switch (status?.toLowerCase()) {
    case "completed":
      return "border-green-200 bg-green-50 text-green-800";
    case "work order":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "quote":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-gray-200 bg-gray-100 text-gray-700";
  }
}

function toTableOptions(values: string[]): TableOption[] {
  return values.map((value) => ({ label: value, value }));
}

export default function ServiceM8Page() {
  const { data: connData, error: connError, isLoading: connLoading } = useSWR<ConnectionData>(
    "/api/servicem8/connection",
    fetcher
  );
  const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "clients" | "settings">(
    "overview"
  );
  const [disconnecting, setDisconnecting] = useState(false);
  const [importingClients, setImportingClients] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [urlMessage, setUrlMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const popupPollRef = useRef<number | null>(null);

  const isConnected = connData?.connected === true;

  function clearConnectPolling() {
    if (popupPollRef.current !== null) {
      window.clearInterval(popupPollRef.current);
      popupPollRef.current = null;
    }
  }

  async function resumePendingServiceM8Action() {
    const pendingAction = getPendingServiceM8Action();
    if (!pendingAction) {
      return;
    }

    clearPendingServiceM8Action();

    if (pendingAction === "import_clients") {
      await handleImportClients({ allowConnectRedirect: false });
    }
  }

  async function handleConnect() {
    setUrlMessage(null);
    setIsConnecting(true);
    window.location.href = "/api/servicem8/activate";
  }

  async function handleDisconnect() {
    if (
      !confirm(
        "Are you sure you want to disconnect ServiceM8? This will remove the integration but keep any imported data."
      )
    ) {
      return;
    }

    clearPendingServiceM8Action();
    setDisconnecting(true);

    try {
      await fetch("/api/servicem8/connection", { method: "DELETE" });
      await mutate("/api/servicem8/connection");
    } catch (error) {
      console.error("Failed to disconnect:", error);
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSyncSettingChange(key: "syncEnabled" | "syncDirection", value: boolean | string) {
    try {
      await fetch("/api/servicem8/connection", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      await mutate("/api/servicem8/connection");
    } catch (error) {
      console.error("Failed to update setting:", error);
    }
  }

  async function handleImportClients(options: { allowConnectRedirect?: boolean } = {}) {
    const { allowConnectRedirect = true } = options;
    setImportingClients(true);
    setImportResult(null);
    setImportError(null);

    try {
      if (allowConnectRedirect && !isConnected) {
        setPendingServiceM8Action("import_clients");
        await handleConnect();
        return;
      }

      const res = await fetch("/api/servicem8/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_all" }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        imported?: number;
        updated?: number;
        skipped?: number;
        total?: number;
        importedWithGaps?: number;
        warnings?: string[];
        error?: string;
      };

      if (!res.ok) {
        if (allowConnectRedirect && (res.status === 401 || data.error === "ServiceM8 not connected")) {
          setPendingServiceM8Action("import_clients");
          await handleConnect();
          return;
        }

        throw new Error(data.error || "Failed to import clients");
      }

      clearPendingServiceM8Action();

      if (data.success) {
        setImportResult({
          imported: data.imported ?? 0,
          updated: data.updated ?? 0,
          skipped: data.skipped ?? 0,
          total: data.total ?? 0,
          importedWithGaps: data.importedWithGaps ?? 0,
          warnings: data.warnings ?? [],
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to import clients";
      console.error("Failed to import clients:", error);
      setImportError(message);
    } finally {
      setImportingClients(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("success") === "connected") {
      setUrlMessage({ type: "success", text: "ServiceM8 connected successfully!" });
      void (async () => {
        await mutate("/api/servicem8/connection");
        await resumePendingServiceM8Action();
      })();
    } else if (params.get("error")) {
      clearPendingServiceM8Action();
      const errorMap: Record<string, string> = {
        no_code: "Authorization failed - no code received from ServiceM8.",
        invalid_state: "Security check failed. Please try again.",
        no_team: "You need to be part of a team to connect ServiceM8.",
        callback_failed: "Connection failed. Please try again.",
        servicem8_activation_failed: "Addon activation failed. Please try again.",
      };
      const errorKey = params.get("error") || "";
      setUrlMessage({ type: "error", text: errorMap[errorKey] || `Error: ${errorKey}` });
    }

    if (params.has("success") || params.has("error")) {
      window.history.replaceState({}, "", "/dashboard/servicem8");
    }
  }, []);

  useEffect(() => {
    const errorMap: Record<string, string> = {
      no_code: "Authorization failed - no code received from ServiceM8.",
      invalid_state: "Security check failed. Please try again.",
      no_team: "You need to be part of a team to connect ServiceM8.",
      callback_failed: "Connection failed. Please try again.",
      servicem8_activation_failed: "Addon activation failed. Please try again.",
    };

    function handleOAuthMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload = event.data as { source?: string; success?: string; error?: string } | null;
      if (!payload || payload.source !== "servicem8-oauth") {
        return;
      }

      clearConnectPolling();
      setIsConnecting(false);

      if (payload.success === "connected") {
        setUrlMessage({ type: "success", text: "ServiceM8 connected successfully!" });
        void (async () => {
          await mutate("/api/servicem8/connection");
          await resumePendingServiceM8Action();
        })();
        return;
      }

      clearPendingServiceM8Action();
      const errorKey = payload.error || "callback_failed";
      setUrlMessage({ type: "error", text: errorMap[errorKey] || `Error: ${errorKey}` });
    }

    window.addEventListener("message", handleOAuthMessage);
    return () => {
      window.removeEventListener("message", handleOAuthMessage);
      clearConnectPolling();
    };
  }, []);

  return (
    <main className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ServiceM8 Integration</h2>
          <p className="text-muted-foreground">
            Connect your ServiceM8 account to sync jobs, customers, and certificates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <XCircle className="h-4 w-4" />
              Not connected
            </div>
          )}
        </div>
      </div>

      {urlMessage ? (
        <div
          className={`rounded-lg border p-4 ${
            urlMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {urlMessage.text}
        </div>
      ) : null}

      {connError && !connLoading ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load ServiceM8 connection.
        </div>
      ) : null}

      {connData?.connection?.reconnectRequired ? (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Reconnect ServiceM8 to read client contact details</p>
            <p className="mt-1 text-sm">
              {connData.connection.reconnectReason ??
                "This connection is missing OAuth scopes that ServiceM8 requires before it will return contact details and images."}
            </p>
            <p className="mt-1 text-xs">
              Missing scopes: {connData.connection.missingScopes.join(", ")}
            </p>
          </div>
          <Button onClick={handleConnect} className="shrink-0" disabled={isConnecting}>
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Reconnect
          </Button>
        </div>
      ) : null}

      {!connLoading && !isConnected ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              Connect ServiceM8
            </CardTitle>
            <CardDescription>
              Link your ServiceM8 account to automatically sync jobs, customers, and attach
              completed certificates to jobs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <Briefcase className="mt-0.5 h-5 w-5 text-orange-500" />
                <div>
                  <h4 className="font-medium">Job Sync</h4>
                  <p className="text-sm text-muted-foreground">
                    Sync jobs from ServiceM8 and link them to certificates.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <Users className="mt-0.5 h-5 w-5 text-orange-500" />
                <div>
                  <h4 className="font-medium">Client Import</h4>
                  <p className="text-sm text-muted-foreground">
                    Import customers from ServiceM8 into your customer list.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <ArrowUpFromLine className="mt-0.5 h-5 w-5 text-orange-500" />
                <div>
                  <h4 className="font-medium">PDF Attachments</h4>
                  <p className="text-sm text-muted-foreground">
                    Attach completed certificate PDFs to ServiceM8 jobs.
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={handleConnect} size="lg" className="w-full md:w-auto" disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plug className="mr-2 h-4 w-4" />
              )}
              {isConnecting ? "Opening ServiceM8…" : "Connect to ServiceM8"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {connLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {isConnected && connData?.connection ? (
        <>
          <div className="border-b">
            <nav className="flex flex-wrap gap-2 sm:gap-8">
              {(["overview", "jobs", "clients", "settings"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`border-b-2 px-1 py-2 text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-muted-foreground hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === "overview" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Connection</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {connData.connection.servicem8CompanyName || "Connected"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connected since {new Date(connData.connection.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sync Direction</CardTitle>
                  <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold capitalize">
                    {connData.connection.syncDirection?.replace("_", " ") || "Bidirectional"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {connData.connection.syncEnabled ? "Sync enabled" : "Sync paused"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {formatDateTime(connData.connection.lastSyncAt)}
                  </div>
                  <p className="text-xs text-muted-foreground">Last synchronisation time</p>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {activeTab === "jobs" ? <JobsTab /> : null}

          {activeTab === "clients" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-medium">ServiceM8 Clients</h3>
                  <p className="text-sm text-muted-foreground">
                    Search, sort, filter, and group clients from ServiceM8.
                  </p>
                </div>

                <Button onClick={() => handleImportClients()} disabled={importingClients} variant="outline">
                  {importingClients ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                  )}
                  Import All Clients
                </Button>
              </div>

              {importError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                  {importError}
                </div>
              ) : null}

              {importResult ? (
                <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
                  <div className="text-sm">
                    Imported {importResult.imported} new client
                    {importResult.imported === 1 ? "" : "s"}, refreshed {importResult.updated},
                    skipped {importResult.skipped} of {importResult.total}.
                  </div>

                  {importResult.importedWithGaps > 0 ? (
                    <div className="text-sm text-amber-800">
                      {importResult.importedWithGaps} client
                      {importResult.importedWithGaps === 1 ? "" : "s"} have no email, phone or
                      mobile number recorded in ServiceM8.
                    </div>
                  ) : null}

                  {importResult.warnings.length > 0 ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                      {importResult.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              <ClientsTab />
            </div>
          ) : null}

          {activeTab === "settings" ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sync Settings</CardTitle>
                  <CardDescription>
                    Configure how data syncs between AI-Certificates and ServiceM8.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="font-medium">Enable Sync</h4>
                      <p className="text-sm text-muted-foreground">
                        Automatically sync data between systems
                      </p>
                    </div>
                    <Button
                      variant={connData.connection.syncEnabled ? "default" : "outline"}
                      onClick={() =>
                        handleSyncSettingChange("syncEnabled", !connData.connection!.syncEnabled)
                      }
                    >
                      {connData.connection.syncEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  <div>
                    <h4 className="mb-3 font-medium">Sync Direction</h4>
                    <div className="grid gap-2 md:grid-cols-3">
                      {[
                        {
                          value: "from_servicem8",
                          label: "From ServiceM8",
                          icon: ArrowDownToLine,
                          desc: "Import from ServiceM8 only",
                        },
                        {
                          value: "to_servicem8",
                          label: "To ServiceM8",
                          icon: ArrowUpFromLine,
                          desc: "Export to ServiceM8 only",
                        },
                        {
                          value: "bidirectional",
                          label: "Bidirectional",
                          icon: ArrowLeftRight,
                          desc: "Sync both ways",
                        },
                      ].map(({ value, label, icon: Icon, desc }) => (
                        <button
                          key={value}
                          onClick={() => handleSyncSettingChange("syncDirection", value)}
                          className={`rounded-lg border p-4 text-left transition-colors ${
                            connData.connection!.syncDirection === value
                              ? "border-orange-500 bg-orange-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <Icon className="mb-2 h-5 w-5" />
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs text-muted-foreground">{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  <CardDescription>
                    Disconnect ServiceM8 from your account. This will not delete any previously
                    imported data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
                    {disconnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="mr-2 h-4 w-4" />
                    )}
                    Disconnect ServiceM8
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function JobsTab() {
  const { data, error, isLoading } = useSWR<{ jobs: SM8Job[]; warnings?: string[] }>(
    "/api/servicem8/jobs",
    fetcher
  );
  const jobs = data?.jobs ?? [];
  const warnings = data?.warnings ?? [];

  const columns = useMemo<ColumnDef<SM8Job>[]>(
    () => [
      {
        accessorKey: "generated_job_id",
        header: "Job ID",
        cell: ({ row }) => <div className="font-medium">{row.original.generated_job_id || "-"}</div>,
      },
      {
        accessorKey: "job_description",
        header: "Description",
        cell: ({ row }) => (
          <div className="max-w-[24rem] break-words">{row.original.job_description || "-"}</div>
        ),
      },
      {
        accessorKey: "job_address",
        header: "Address",
        cell: ({ row }) => (
          <div className="max-w-[24rem] break-words text-muted-foreground">
            {row.original.workAddress || row.original.job_address || "-"}
          </div>
        ),
      },
      {
        accessorKey: "customer_name",
        header: "Customer",
        cell: ({ row }) => {
          const customerName =
            row.original.customer_name ||
            row.original.billingContactName ||
            formatContactName(row.original.firstName, row.original.lastName);
          const contact = [row.original.email, row.original.mobile, row.original.phone]
            .filter(Boolean)
            .join(" · ");

          return (
            <div className="max-w-[20rem]">
              <div className="font-medium">{customerName}</div>
              {contact ? (
                <div className="break-words text-xs text-muted-foreground">{contact}</div>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="outline" className={`border ${getJobStatusClass(row.original.status)}`}>
            {row.original.status || "Unknown"}
          </Badge>
        ),
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => <div className="text-muted-foreground">{formatDate(row.original.date)}</div>,
      },
    ],
    []
  );

  const statusOptions = useMemo(
    () =>
      toTableOptions(
        Array.from(new Set(jobs.map((job) => job.status?.trim()).filter((status): status is string => Boolean(status))))
      ),
    [jobs]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.jobs) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Failed to load jobs. Please try again.
      </div>
    );
  }

  if (jobs.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No jobs found in ServiceM8.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">ServiceM8 Jobs</h3>
        <p className="text-sm text-muted-foreground">
          Search, sort, filter, and group jobs from ServiceM8.
        </p>
      </div>

      {warnings.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <ServiceM8DataTable
        data={jobs}
        columns={columns}
        searchPlaceholder="Search job number, description, address, customer..."
        getSearchText={(job) =>
          [
            job.generated_job_id,
            job.job_description,
            job.job_address,
            job.workAddress,
            job.status,
            job.customer_name,
            job.billingContactName,
            job.companyName,
            job.firstName,
            job.lastName,
            job.email,
            job.phone,
            job.mobile,
          ]
            .filter(Boolean)
            .join(" ")
        }
        filters={
          statusOptions.length > 0
            ? [
                {
                  columnId: "status",
                  label: "Status",
                  options: statusOptions,
                },
              ]
            : []
        }
        groupOptions={[
          { label: "Status", value: "status" },
          { label: "Customer", value: "customer" },
        ]}
        getGroupValue={(job, groupBy) => {
          if (groupBy === "status") {
            return job.status || "Unknown";
          }

          if (groupBy === "customer") {
            return (
              job.customer_name ||
              job.billingContactName ||
              formatContactName(job.firstName, job.lastName) ||
              "Unspecified"
            );
          }

          return "Unspecified";
        }}
        emptyMessage="No jobs found in ServiceM8."
      />
    </div>
  );
}

function ClientsTab() {
  const { data, error, isLoading } = useSWR<{ clients: SM8Client[]; warnings?: string[] }>(
    "/api/servicem8/clients",
    fetcher
  );
  const clients = data?.clients ?? [];
  const warnings = data?.warnings ?? [];

  const columns = useMemo<ColumnDef<SM8Client>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Client",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            {row.original.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.original.images[0].fileUrl}
                alt={row.original.name}
                className="h-9 w-9 shrink-0 rounded-md border border-gray-200 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 text-[10px] text-muted-foreground">
                n/a
              </div>
            )}
            <div className="min-w-0">
              <div className="font-medium">{row.original.name}</div>
              {row.original.abnNumber ? (
                <div className="text-xs text-muted-foreground">ABN {row.original.abnNumber}</div>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "billingContactName",
        header: "Contact",
        cell: ({ row }) => (
          <div>
            <div>
              {row.original.billingContactName ||
                formatContactName(row.original.firstName, row.original.lastName)}
            </div>
            {row.original.contacts.length > 1 ? (
              <div className="text-xs text-muted-foreground">
                +{row.original.contacts.length - 1} more contact
                {row.original.contacts.length - 1 === 1 ? "" : "s"}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="max-w-[20rem] break-words text-muted-foreground">
            {row.original.email || (
              <span className="text-amber-700">Not held in ServiceM8</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            <div>
              {row.original.phone ||
                row.original.mobile || (
                  <span className="text-amber-700">Not held in ServiceM8</span>
                )}
            </div>
            {row.original.phone && row.original.mobile ? (
              <div className="text-xs">Mobile {row.original.mobile}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: "city",
        accessorFn: (row) => row.addressDetails.city ?? row.addressDetails.state ?? "",
        header: "City",
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            {row.original.addressDetails.city || row.original.addressDetails.state || "-"}
          </div>
        ),
      },
      {
        accessorKey: "postcode",
        header: "Postcode",
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            {row.original.postcode || row.original.billingPostcode || "-"}
          </div>
        ),
      },
      {
        accessorKey: "address",
        header: "Address",
        cell: ({ row }) => (
          <div className="max-w-[24rem] break-words text-muted-foreground">
            {formatAddress(
              Array.from(new Set([row.original.address, row.original.billingAddress])),
            )}
          </div>
        ),
      },
      {
        id: "completeness",
        accessorFn: (row) => getMissingServiceM8ClientFields(row).join(", "),
        header: "Missing",
        cell: ({ row }) => {
          const missing = getMissingServiceM8ClientFields(row.original);

          if (missing.length === 0) {
            return <Badge variant="outline">Complete</Badge>;
          }

          return (
            <div className="max-w-[16rem] break-words text-xs text-amber-700">
              {missing.join(", ")}
            </div>
          );
        },
      },
    ],
    []
  );

  const cityOptions = useMemo(
    () =>
      toTableOptions(
        Array.from(
          new Set(
            clients
              .map((client) => client.addressDetails.city?.trim())
              .filter((city): city is string => Boolean(city))
          )
        )
      ),
    [clients]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data?.clients) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Failed to load clients. Please try again.
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No clients found in ServiceM8.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {warnings.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <ServiceM8DataTable
        data={clients}
        columns={columns}
        searchPlaceholder="Search company, contact, email, phone, or address..."
        getSearchText={(client) =>
          [
            client.name,
            client.companyName,
            client.firstName,
            client.lastName,
            client.billingContactName,
            client.email,
            client.phone,
            client.mobile,
            client.website,
            client.abnNumber,
            client.address,
            client.billingAddress,
            client.postcode,
            client.billingPostcode,
            client.addressDetails.city,
            client.addressDetails.state,
            client.addressDetails.postcode,
          ]
            .filter(Boolean)
            .join(" ")
        }
        filters={
          cityOptions.length > 0
            ? [
                {
                  columnId: "city",
                  label: "City",
                  options: cityOptions,
                },
              ]
            : []
        }
        groupOptions={[
          { label: "City", value: "city" },
          { label: "Has email", value: "email" },
        ]}
        getGroupValue={(client, groupBy) => {
          if (groupBy === "city") {
            return client.addressDetails.city || client.addressDetails.state || "Unspecified";
          }

          if (groupBy === "email") {
            return client.email ? "With email" : "No email";
          }

          return "Unspecified";
        }}
        emptyMessage="No clients found in ServiceM8."
      />
    </div>
  );
}
