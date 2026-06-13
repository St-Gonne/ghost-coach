import { useListActivities, useCreateActivity, useUpdateActivity, useDeleteActivity } from "@workspace/api-client-react";
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
import { getListActivitiesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings2, ShieldCheck, Trash2 } from "lucide-react";

const activitySchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  minimumMinutes: z.coerce.number().min(1),
  preferredMinutes: z.coerce.number().min(1),
  maximumMinutes: z.coerce.number().min(1),
  intensity: z.string(),
  active: z.boolean(),
  isPhysioApproved: z.boolean(),
  requiresFloorSpace: z.boolean(),
  requiresPool: z.boolean(),
  requiresStairs: z.boolean(),
  requiresShower: z.boolean(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

export default function Activities() {
  const { data: activities, isLoading } = useListActivities();
  const createMutation = useCreateActivity();
  const updateMutation = useUpdateActivity();
  const deleteMutation = useDeleteActivity();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      name: "",
      category: "strength",
      minimumMinutes: 15,
      preferredMinutes: 30,
      maximumMinutes: 60,
      intensity: "moderate",
      active: true,
      isPhysioApproved: false,
      requiresFloorSpace: false,
      requiresPool: false,
      requiresStairs: false,
      requiresShower: false,
    }
  });

  const onSubmit = (data: ActivityFormValues) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
            toast({ title: "Updated", description: "Activity updated successfully" });
            setIsDialogOpen(false);
          }
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
            toast({ title: "Created", description: "Activity created successfully" });
            setIsDialogOpen(false);
          }
        }
      );
    }
  };

  const handleEdit = (activity: any) => {
    setEditingId(activity.id);
    form.reset({
      name: activity.name,
      category: activity.category,
      minimumMinutes: activity.minimumMinutes,
      preferredMinutes: activity.preferredMinutes,
      maximumMinutes: activity.maximumMinutes,
      intensity: activity.intensity,
      active: activity.active,
      isPhysioApproved: activity.isPhysioApproved,
      requiresFloorSpace: activity.requiresFloorSpace,
      requiresPool: activity.requiresPool,
      requiresStairs: activity.requiresStairs,
      requiresShower: activity.requiresShower,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this activity?")) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
          toast({ title: "Deleted", description: "Activity deleted successfully" });
        }
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Activity Library</h1>
          <p className="text-muted-foreground mt-1 text-lg">Templates the coach can pull from.</p>
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
              <Plus className="w-4 h-4 mr-2" /> New Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Activity" : "Create Activity"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="strength">Strength</SelectItem>
                            <SelectItem value="cardio">Cardio</SelectItem>
                            <SelectItem value="flexibility">Flexibility</SelectItem>
                            <SelectItem value="recovery">Recovery</SelectItem>
                            <SelectItem value="physio">Physio</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="intensity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intensity</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select intensity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="minimumMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Mins</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="preferredMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pref Mins</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maximumMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Mins</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Active</FormLabel>
                          <p className="text-[0.8rem] text-muted-foreground">Can be scheduled</p>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isPhysioApproved"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Physio Approved</FormLabel>
                          <p className="text-[0.8rem] text-muted-foreground">Safe for rehab</p>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  Save Activity
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities?.map((activity) => (
            <Card key={activity.id} className={!activity.active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{activity.name}</CardTitle>
                    <CardDescription className="uppercase mt-1 text-xs tracking-wider font-semibold">
                      {activity.category}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {activity.isPhysioApproved && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        <ShieldCheck className="w-3 h-3 mr-1" /> Physio
                      </Badge>
                    )}
                    <Badge variant="outline">{activity.intensity}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground mb-4">
                  {activity.minimumMinutes} - {activity.maximumMinutes} mins (pref: {activity.preferredMinutes}m)
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(activity)}>
                    <Settings2 className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(activity.id)}>
                    <Trash2 className="w-4 h-4" />
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
