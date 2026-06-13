import { useListLocations, useCreateLocation, useUpdateLocation, useSetCurrentLocation } from "@workspace/api-client-react";
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
import { getListLocationsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings2, MapPin, Check } from "lucide-react";

const locationSchema = z.object({
  label: z.string().min(1, "Label is required"),
  locationType: z.string().min(1, "Type is required"),
  isDefault: z.boolean(),
  hasFloorSpace: z.boolean(),
  hasPool: z.boolean(),
  hasStairs: z.boolean(),
  hasShower: z.boolean(),
  publicPrivacyLevel: z.string(),
});

type LocationFormValues = z.infer<typeof locationSchema>;

export default function Locations() {
  const { data: locations, isLoading } = useListLocations();
  const createMutation = useCreateLocation();
  const updateMutation = useUpdateLocation();
  const setCurrentLocation = useSetCurrentLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      label: "",
      locationType: "home",
      isDefault: false,
      hasFloorSpace: false,
      hasPool: false,
      hasStairs: false,
      hasShower: false,
      publicPrivacyLevel: "high",
    }
  });

  const onSubmit = (data: LocationFormValues) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
            toast({ title: "Updated", description: "Location updated successfully" });
            setIsDialogOpen(false);
          }
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
            toast({ title: "Created", description: "Location created successfully" });
            setIsDialogOpen(false);
          }
        }
      );
    }
  };

  const handleEdit = (location: any) => {
    setEditingId(location.id);
    form.reset({
      label: location.label,
      locationType: location.locationType,
      isDefault: location.isDefault,
      hasFloorSpace: location.hasFloorSpace,
      hasPool: location.hasPool,
      hasStairs: location.hasStairs,
      hasShower: location.hasShower,
      publicPrivacyLevel: location.publicPrivacyLevel,
    });
    setIsDialogOpen(true);
  };

  const handleSetCurrent = (id: string) => {
    setCurrentLocation.mutate({ data: { locationId: id } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLocationsQueryKey() });
        toast({ title: "Current Location Set", description: "Your current location has been updated." });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Saved Locations</h1>
          <p className="text-muted-foreground mt-1 text-lg">Where you spend your time.</p>
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
              <Plus className="w-4 h-4 mr-2" /> Add Location
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Location" : "Add Location"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="locationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="home">Home</SelectItem>
                            <SelectItem value="work">Work</SelectItem>
                            <SelectItem value="gym">Gym</SelectItem>
                            <SelectItem value="travel">Travel</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="publicPrivacyLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Privacy Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select privacy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="high">High (Private)</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low (Public)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Default Location</FormLabel>
                          <p className="text-[0.8rem] text-muted-foreground">Used when unknown</p>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <FormLabel>Facilities</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="hasFloorSpace"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel>Floor Space</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hasPool"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel>Pool</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hasStairs"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel>Stairs</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="hasShower"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel>Shower</FormLabel>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  Save Location
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
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations?.map((loc) => (
            <Card key={loc.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-accent" />
                      {loc.label}
                    </CardTitle>
                    <CardDescription className="uppercase mt-1 text-xs tracking-wider font-semibold">
                      {loc.locationType}
                    </CardDescription>
                  </div>
                  {loc.isDefault && <Badge>Default</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mt-2 mb-6">
                  {loc.hasFloorSpace && <Badge variant="outline">Floor Space</Badge>}
                  {loc.hasPool && <Badge variant="outline">Pool</Badge>}
                  {loc.hasStairs && <Badge variant="outline">Stairs</Badge>}
                  {loc.hasShower && <Badge variant="outline">Shower</Badge>}
                </div>
                
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={() => handleSetCurrent(loc.id)} disabled={setCurrentLocation.isPending}>
                    <Check className="w-4 h-4 mr-2" /> Mark Here Now
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(loc)}>
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
