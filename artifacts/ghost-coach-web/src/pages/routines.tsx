import { useListRoutines, useCreateRoutine, useUpdateRoutine, useListActivities } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListRoutinesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings2, HeartPulse } from "lucide-react";

const routineSchema = z.object({
  activityTemplateId: z.string().min(1, "Activity is required"),
  sourceLabel: z.string().min(1, "Source label is required"),
  targetFrequencyPerWeek: z.coerce.number().min(1),
  minimumGapHours: z.coerce.number().min(0),
  active: z.boolean(),
});

type RoutineFormValues = z.infer<typeof routineSchema>;

export default function Routines() {
  const { data: routines, isLoading: routinesLoading } = useListRoutines();
  const { data: activities, isLoading: activitiesLoading } = useListActivities();
  const createMutation = useCreateRoutine();
  const updateMutation = useUpdateRoutine();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<RoutineFormValues>({
    resolver: zodResolver(routineSchema),
    defaultValues: {
      activityTemplateId: "",
      sourceLabel: "Physio",
      targetFrequencyPerWeek: 3,
      minimumGapHours: 24,
      active: true,
    }
  });

  const onSubmit = (data: RoutineFormValues) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListRoutinesQueryKey() });
            toast({ title: "Updated", description: "Routine updated successfully" });
            setIsDialogOpen(false);
          }
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListRoutinesQueryKey() });
            toast({ title: "Created", description: "Routine created successfully" });
            setIsDialogOpen(false);
          }
        }
      );
    }
  };

  const handleEdit = (routine: any) => {
    setEditingId(routine.id);
    form.reset({
      activityTemplateId: routine.activityTemplateId,
      sourceLabel: routine.sourceLabel,
      targetFrequencyPerWeek: routine.targetFrequencyPerWeek,
      minimumGapHours: routine.minimumGapHours,
      active: routine.active,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Physio Routines</h1>
          <p className="text-muted-foreground mt-1 text-lg">Prescriptions and mandatory maintenance.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingId(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Add Routine
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Routine" : "Add Routine"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="activityTemplateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Activity Template</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an activity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activities?.map(a => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sourceLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source (e.g. PT Name)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetFrequencyPerWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target / Week</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="minimumGapHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Gap (Hours)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <p className="text-[0.8rem] text-muted-foreground">Currently prescribed</p>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  Save Routine
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {routinesLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {routines?.map((routine) => (
            <Card key={routine.id} className={!routine.active ? "opacity-60" : ""}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-accent" />
                    {routine.activityTemplate?.name || "Unknown Activity"}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Prescribed by {routine.sourceLabel}
                  </CardDescription>
                </div>
                <Badge variant={routine.active ? "default" : "secondary"}>
                  {routine.active ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm mt-2">
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold">Target</span>
                    <span className="font-medium">{routine.targetFrequencyPerWeek}x / week</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider font-semibold">Min Gap</span>
                    <span className="font-medium">{routine.minimumGapHours} hours</span>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(routine)}>
                    <Settings2 className="w-4 h-4 mr-2" /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
