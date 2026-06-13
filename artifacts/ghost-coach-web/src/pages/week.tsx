import { useGetWeek } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle } from "lucide-react";

export default function Week() {
  const { data: week, isLoading } = useGetWeek();

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!week) return <div>No week data available.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">7-Day Timeline</h1>
        <p className="text-muted-foreground mt-1 text-lg">Review your consistency.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider font-semibold text-xs">Active Days</CardDescription>
            <CardTitle className="text-3xl">{week.activeDaysCompleted} <span className="text-muted-foreground text-lg">/ {week.targetActiveDays}</span></CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider font-semibold text-xs">Completion Rate</CardDescription>
            <CardTitle className="text-3xl">{Math.round(week.completionRate * 100)}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider font-semibold text-xs">Completed Minutes</CardDescription>
            <CardTitle className="text-3xl">{week.completedMinutes}</CardTitle>
          </CardHeader>
        </Card>
        {week.physioTarget !== undefined && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="uppercase tracking-wider font-semibold text-xs">Physio Sessions</CardDescription>
              <CardTitle className="text-3xl">{week.physioSessions || 0} <span className="text-muted-foreground text-lg">/ {week.physioTarget}</span></CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {week.days?.map((day, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-secondary">
                <div className="flex items-center gap-4">
                  {day.outcome === 'COMPLETED' ? (
                    <CheckCircle2 className="w-5 h-5 text-accent" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-medium">{new Date(day.date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                    <div className="text-sm text-muted-foreground">{day.activityName || "No activity"}</div>
                  </div>
                </div>
                {day.minutes && <div className="text-sm font-semibold">{day.minutes} min</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
