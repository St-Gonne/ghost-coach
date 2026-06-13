import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const settingsSchema = z.object({
  targetActiveDaysPerWeek: z.coerce.number().min(1).max(7),
  coachingIntensity: z.coerce.number().min(1).max(5),
  morningBriefLocalTime: z.string(),
  quietHoursStart: z.string(),
  quietHoursEnd: z.string(),
  calendarWriteEnabled: z.boolean(),
  weatherHeatThresholdC: z.coerce.number(),
  preferCompletionOverProgression: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateMutation = useUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      targetActiveDaysPerWeek: 4,
      coachingIntensity: 3,
      morningBriefLocalTime: "07:00:00",
      quietHoursStart: "22:00:00",
      quietHoursEnd: "07:00:00",
      calendarWriteEnabled: false,
      weatherHeatThresholdC: 30,
      preferCompletionOverProgression: true,
    }
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        targetActiveDaysPerWeek: settings.targetActiveDaysPerWeek,
        coachingIntensity: settings.coachingIntensity,
        morningBriefLocalTime: settings.morningBriefLocalTime,
        quietHoursStart: settings.quietHoursStart,
        quietHoursEnd: settings.quietHoursEnd,
        calendarWriteEnabled: settings.calendarWriteEnabled,
        weatherHeatThresholdC: settings.weatherHeatThresholdC,
        preferCompletionOverProgression: settings.preferCompletionOverProgression,
      });
    }
  }, [settings, form]);

  const onSubmit = (data: SettingsFormValues) => {
    updateMutation.mutate(
      { data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          toast({ title: "Settings Saved", description: "Your coaching configuration has been updated." });
        }
      }
    );
  };

  if (isLoading) {
    return <Skeleton className="h-[600px] w-full max-w-2xl" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Configuration</h1>
        <p className="text-muted-foreground mt-1 text-lg">Tune the coach's behavior.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle>Core Directives</CardTitle>
              <CardDescription>Fundamental goals for the coach.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="targetActiveDaysPerWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Active Days / Week: {field.value}</FormLabel>
                    <FormControl>
                      <Slider 
                        min={1} max={7} step={1} 
                        value={[field.value]} 
                        onValueChange={(vals) => field.onChange(vals[0])} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="coachingIntensity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coaching Intensity: {field.value} / 5</FormLabel>
                    <CardDescription className="mb-3">1 = Gentle suggestions, 5 = Aggressive blocking</CardDescription>
                    <FormControl>
                      <Slider 
                        min={1} max={5} step={1} 
                        value={[field.value]} 
                        onValueChange={(vals) => field.onChange(vals[0])} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule Boundaries</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="morningBriefLocalTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Morning Brief Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="col-span-2 grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="quietHoursStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quiet Hours Start</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quietHoursEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quiet Hours End</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions & Thresholds</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="calendarWriteEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Calendar Write Access</FormLabel>
                      <p className="text-sm text-muted-foreground">Allow coach to block time on your calendar</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="preferCompletionOverProgression"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Prefer Completion over Progression</FormLabel>
                      <p className="text-sm text-muted-foreground">Suggest easier backups rather than skipping</p>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weatherHeatThresholdC"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heat Threshold (°C)</FormLabel>
                    <CardDescription>Avoid outdoor activities above this temp</CardDescription>
                    <FormControl><Input type="number" {...field} className="w-32" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" disabled={updateMutation.isPending}>
            Save Configuration
          </Button>
        </form>
      </Form>
    </div>
  );
}
