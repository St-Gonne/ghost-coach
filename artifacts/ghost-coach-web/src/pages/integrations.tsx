import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useEnsureWriteCalendar,
  useGetAuthStatus,
  useGetIntegrationsStatus,
  useListGoogleCalendars,
  useLogout,
  useSaveReadCalendars,
  useTestGoogleRead,
  useTestGoogleWrite,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export default function Integrations() {
  const queryClient = useQueryClient();
  const { data: auth } = useGetAuthStatus();
  const { data: status } = useGetIntegrationsStatus();
  const { data: calendars } = useListGoogleCalendars();

  const selectedIds = useMemo(
    () =>
      new Set(
        calendars?.calendars.filter((calendar) => calendar.selected).map((calendar) => calendar.id) ??
          [],
      ),
    [calendars],
  );

  const saveReadCalendars = useSaveReadCalendars({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    },
  });
  const ensureWriteCalendar = useEnsureWriteCalendar({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
    },
  });
  const testRead = useTestGoogleRead();
  const testWrite = useTestGoogleWrite();
  const logout = useLogout({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        window.location.href = "/";
      },
    },
  });

  const toggleCalendar = (calendarId: string, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(calendarId);
    } else {
      next.delete(calendarId);
    }

    saveReadCalendars.mutate({
      data: { calendarIds: Array.from(next) },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect Google, choose read calendars, and verify the dedicated Ghost Coach write calendar.
          </p>
        </div>
        {!auth?.mockMode && (
          <Button variant="outline" onClick={() => logout.mutate()}>
            Sign out
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Authentication
            <Badge variant={auth?.authenticated ? "default" : "secondary"}>
              {auth?.authenticated ? "Connected" : "Not connected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>Allowed email configured: {auth?.allowedEmailConfigured ? "Yes" : "No"}</div>
          <div>Signed-in account: {auth?.user?.email ?? "None"}</div>
          {!auth?.mockMode && !auth?.authenticated && (
            <Button onClick={() => (window.location.href = "/api/auth/google/start")}>
              Connect Google
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Calendar
            <Badge variant={status?.calendar.connected ? "default" : "secondary"}>
              {status?.calendar.connected ? "Connected" : "Not connected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Provider account: {status?.calendar.providerAccountEmail ?? "Not connected"}
          </div>
          <div className="space-y-3">
            {(calendars?.calendars ?? []).map((calendar) => (
              <label
                key={calendar.id}
                className="flex items-center justify-between rounded border p-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={calendar.selected}
                    onCheckedChange={(checked) => toggleCalendar(calendar.id, checked === true)}
                  />
                  <div>
                    <div className="font-medium">{calendar.summary}</div>
                    <div className="text-xs text-muted-foreground">
                      {calendar.accessRole}
                      {calendar.primary ? " · primary" : ""}
                      {calendar.writeSelected ? " · write calendar" : ""}
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => ensureWriteCalendar.mutate()}>
              Ensure Ghost Coach Calendar
            </Button>
            <Button variant="outline" onClick={() => testRead.mutate()}>
              Test Read
            </Button>
            <Button variant="outline" onClick={() => testWrite.mutate()}>
              Test Write/Delete
            </Button>
          </div>
          {status?.calendar.writeCalendarId && (
            <div className="text-sm text-muted-foreground">
              Dedicated write calendar ID: {status.calendar.writeCalendarId}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weather</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Adapter: {status?.weather.mock ? "Mock" : "Open-Meteo"}
        </CardContent>
      </Card>
    </div>
  );
}
