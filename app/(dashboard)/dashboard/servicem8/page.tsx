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
  };
}

interface SM8Job {
  uuid: string;
  status: string | null;
  job_address: string | null;
  job_description: string | null;
  generated_job_id: string | null;
  date: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface SM8Client {
  uuid: string;
  name?: string | null;
  address?: string | null;
  postcode?: string | null;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  billing_address: string | null;
  billing_address2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_postcode: string | null;
  billing_country: string | null;
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
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(
    null
  );
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
        skipped?: number;
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
        setImportResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0 });
      }
    } catch (error) {
      console.error("Failed to import clients:", error);
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

              {importResult ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
                  Imported {importResult.imported} clients, skipped {importResult.skipped} already
                  existing.
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
  const { data, error, isLoading } = useSWR<{ jobs: SM8Job[] }>("/api/servicem8/jobs", fetcher);
  const jobs = data?.jobs ?? [];

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
            {row.original.job_address || "-"}
          </div>
        ),
      },
      {
        accessorKey: "first_name",
        header: "Customer",
        cell: ({ row }) => <>{formatContactName(row.original.first_name, row.original.last_name)}</>,
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

      <ServiceM8DataTable
        data={jobs}
        columns={columns}
        searchPlaceholder="Search job number, description, address, customer..."
        getSearchText={(job) =>
          [
            job.generated_job_id,
            job.job_description,
            job.job_address,
            job.status,
            job.first_name,
            job.last_name,
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
            return formatContactName(job.first_name, job.last_name);
          }

          return "Unspecified";
        }}
        emptyMessage="No jobs found in ServiceM8."
      />
    </div>
  );
}

function ClientsTab() {
  const { data, error, isLoading } = useSWR<{ clients: SM8Client[] }>(
    "/api/servicem8/clients",
    fetcher
  );
  const clients = data?.clients ?? [];

  const columns = useMemo<ColumnDef<SM8Client>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Client",
        cell: ({ row }) => (
          <div className="font-medium">
            {row.original.name || row.original.company_name || formatContactName(row.original.first_name, row.original.last_name)}
          </div>
        ),
      },
      {
        accessorKey: "first_name",
        header: "Contact",
        cell: ({ row }) => <div>{formatContactName(row.original.first_name, row.original.last_name)}</div>,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="max-w-[20rem] break-words text-muted-foreground">
            {row.original.email || "-"}
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <div className="text-muted-foreground">
            {row.original.phone || row.original.mobile || "-"}
          </div>
        ),
      },
      {
        accessorKey: "postcode",
        header: "Postcode",
        cell: ({ row }) => <div className="text-muted-foreground">{row.original.postcode || row.original.billing_postcode || "-"}</div>,
      },
      {
        accessorKey: "address",
        header: "Address",
        cell: ({ row }) => (
          <div className="max-w-[24rem] break-words text-muted-foreground">
            {row.original.address ||
              formatAddress([
                row.original.billing_address,
                row.original.billing_address2,
                row.original.billing_city,
                row.original.billing_state,
                row.original.billing_postcode,
                row.original.billing_country,
              ])}
          </div>
        ),
      },
    ],
    []
  );

  const cityOptions = useMemo(
    () =>
      toTableOptions(
        Array.from(
          new Set(clients.map((client) => client.billing_city?.trim()).filter((city): city is string => Boolean(city)))
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
      <ServiceM8DataTable
        data={clients}
        columns={columns}
        searchPlaceholder="Search company, contact, email, phone, or address..."
        getSearchText={(client) =>
          [
            client.name,
            client.address,
            client.postcode,
            client.company_name,
            client.first_name,
            client.last_name,
            client.email,
            client.phone,
            client.mobile,
            client.billing_address,
            client.billing_address2,
            client.billing_city,
            client.billing_state,
            client.billing_postcode,
            client.billing_country,
          ]
            .filter(Boolean)
            .join(" ")
        }
        filters={
          cityOptions.length > 0
            ? [
                {
                  columnId: "billing_city",
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
            return client.billing_city || "Unspecified";
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
