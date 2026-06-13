import { formatInTimeZone } from "date-fns-tz";

export function morningBriefMessage(params: {
  userName: string;
  activityName: string;
  startTime: string;
  endTime: string;
  locationLabel: string;
  reasoningSummary: string;
  weatherSummary: string;
}): string {
  return `Good morning, ${params.userName}. Here's your movement plan for today:

<b>${params.activityName}</b>
${params.startTime} – ${params.endTime} at ${params.locationLabel}

${params.reasoningSummary}

Weather: ${params.weatherSummary}`;
}

export function startPromptMessage(params: {
  activityName: string;
  durationMinutes: number;
}): string {
  return `Time to move. It's time for your <b>${params.activityName}</b> (${params.durationMinutes} min).

Ready?`;
}

export function followUpMessage(params: {
  activityName: string;
}): string {
  return `How did <b>${params.activityName}</b> go? Mark it done, partial, or skip.`;
}

export function backupProposalMessage(params: {
  backupName: string;
  startTime: string;
  endTime: string;
}): string {
  return `No worries. There's still time for the backup: <b>${params.backupName}</b> (${params.startTime} – ${params.endTime}).`;
}

export function eveningSummaryMessage(params: {
  outcome: string;
  activityName: string;
  activeDaysThisWeek: number;
  targetDays: number;
}): string {
  const headline =
    params.outcome === "done"
      ? `Done. ${params.activityName} complete.`
      : params.outcome === "partial"
        ? `Partial session logged for ${params.activityName}.`
        : `${params.activityName} skipped today.`;

  return `${headline}

This week: ${params.activeDaysThisWeek}/${params.targetDays} active days.`;
}
