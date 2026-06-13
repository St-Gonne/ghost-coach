import {
  getGetTodayQueryKey,
  useGetToday,
  usePlanItemAction,
  useReplan,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  MapPin,
  Cloud,
  AlertTriangle,
  CheckCircle,
  CircleDashed,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Today() {
  const { data: today, isLoading } = useGetToday();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const replanMutation = useReplan();
  const actionMutation = usePlanItemAction();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!today) {
    return <div>No active plan for today.</div>;
  }

  const handleAction = (
    id: string,
    action: "done" | "partial" | "skip",
    minutes?: number,
  ) => {
    actionMutation.mutate(
      { id, data: { action, actualMinutes: minutes } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: getGetTodayQueryKey(),
          });
          toast({ title: "Plan updated", description: `Marked as ${action}` });
        },
      },
    );
  };

  const actionableStates = new Set([
    "proposed",
    "calendar_blocked",
    "pre_reminder_sent",
    "start_prompt_sent",
    "started",
  ]);

  const formatItemTiming = (item: {
    scheduledStartAt: string;
    scheduledEndAt: string;
  }) => {
    const start = new Date(item.scheduledStartAt);
    const end = new Date(item.scheduledEndAt);
    const minutes = Math.max(
      0,
      Math.round((end.getTime() - start.getTime()) / 60000),
    );
    return `${start.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })} · ${minutes} min`;
  };

  const handleReplan = () => {
    replanMutation.mutate(undefined, {
      onSuccess: (updatedPlan) => {
        queryClient.setQueryData(getGetTodayQueryKey(), updatedPlan);
        toast({
          title: "Replanned",
          description: "Your day has been replanned.",
        });
      },
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Today's Plan
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            {today.morningMessage || "Let's get moving."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              today.status.toLowerCase() === "completed" ? "default" : "outline"
            }
            className="text-sm font-medium px-3 py-1"
          >
            {today.status}
          </Badge>
          <Button
            variant="outline"
            onClick={handleReplan}
            disabled={replanMutation.isPending}
          >
            Re-plan
          </Button>
        </div>
      </div>

      {!today.primaryItem && today.status === "no_viable_window" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">
              No valid movement window right now
            </CardTitle>
            <CardDescription className="text-amber-800">
              Nothing was added to your calendar. Re-plan later if your schedule
              opens up.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Plan Area */}
        <div className="lg:col-span-2 space-y-6">
          {today.primaryItem && (
            <Card className="border-2 border-primary/20 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-accent" />
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardDescription className="uppercase tracking-wider font-semibold text-accent mb-1">
                      Primary Objective
                    </CardDescription>
                    <CardTitle className="text-2xl">
                      {today.primaryItem.activityTemplate?.name || "Activity"}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary">{today.primaryItem.state}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(
                        today.primaryItem.scheduledStartAt,
                      ).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {today.primaryItem.locationLabelSnapshot ||
                        "Unknown Location"}
                    </span>
                  </div>
                </div>

                {actionableStates.has(
                  today.primaryItem.state.toLowerCase(),
                ) && (
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Button
                      onClick={() =>
                        handleAction(today.primaryItem!.id, "done")
                      }
                      className="bg-accent hover:bg-accent/90"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Mark Done
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        handleAction(today.primaryItem!.id, "partial")
                      }
                    >
                      <CircleDashed className="w-4 h-4 mr-2" /> Mark Partial
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        handleAction(today.primaryItem!.id, "skip")
                      }
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Skip
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {today.backupItem && (
              <Card className="bg-secondary/50 border-secondary">
                <CardHeader className="pb-2">
                  <CardDescription className="font-medium text-muted-foreground uppercase text-xs tracking-wider">
                    Backup Option
                  </CardDescription>
                  <CardTitle className="text-lg">
                    {today.backupItem.activityTemplate?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    {formatItemTiming(today.backupItem)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {today.backupItem.selectionReason}
                  </p>
                </CardContent>
              </Card>
            )}

            {today.minimumWinItem && (
              <Card className="bg-secondary/50 border-secondary">
                <CardHeader className="pb-2">
                  <CardDescription className="font-medium text-muted-foreground uppercase text-xs tracking-wider">
                    Minimum Win
                  </CardDescription>
                  <CardTitle className="text-lg">
                    {today.minimumWinItem.activityTemplate?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    {formatItemTiming(today.minimumWinItem)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {today.minimumWinItem.selectionReason}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-2">
                <Cloud className="w-4 h-4" /> Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {today.weatherSummary || "Unknown weather"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Current Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {today.location?.label || "None set"}
              </p>
            </CardContent>
          </Card>

          {today.integrationWarnings &&
            today.integrationWarnings.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm uppercase tracking-wider font-semibold text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-4 text-sm text-amber-900 space-y-1">
                    {today.integrationWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
}
