import { useState } from "react";
import { useDcas, useCreateDca } from "@/hooks/use-dcas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Building2, Plus, MapPin, TrendingUp, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDcaSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function DcaManagement() {
  const { data: dcas, isLoading } = useDcas();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const createDca = useCreateDca();

  const form = useForm<z.infer<typeof insertDcaSchema>>({
    resolver: zodResolver(insertDcaSchema),
    defaultValues: {
      name: "",
      region: "",
    }
  });

  const onSubmit = (data: z.infer<typeof insertDcaSchema>) => {
    createDca.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        form.reset();
      }
    });
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Agency Management</h1>
          <p className="text-muted-foreground mt-1">Manage external Debt Collection Agencies and monitor performance.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
              <Plus className="h-4 w-4" /> Onboard New DCA
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Onboard New Agency</DialogTitle>
              <DialogDescription>
                Add a new debt collection agency to the platform.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agency Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Acme Collections Ltd" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. North East" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createDca.isPending}>
                    {createDca.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm Onboarding
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
           [...Array(6)].map((_, i) => (
             <Card key={i} className="h-48 animate-pulse bg-muted/50 border-0" />
           ))
        ) : dcas?.map((dca) => (
          <Card key={dca.id} className="group hover:border-primary/50 transition-all duration-300 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-2">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">
                  Active
                </div>
              </div>
              <CardTitle className="text-xl">{dca.name}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {dca.region} Region
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <Users className="h-3 w-3" /> Active Cases
                    </p>
                    <p className="text-xl font-bold">{dca.activeCases}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                      <TrendingUp className="h-3 w-3" /> Recovery Rate
                    </p>
                    <p className="text-xl font-bold">
                      {dca.activeCases! > 0 
                        ? Math.round((dca.recoveredCases! / (dca.activeCases! + dca.recoveredCases!)) * 100) 
                        : 0}%
                    </p>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span>SLA Performance</span>
                    <span className={Number(dca.slaScore) >= 90 ? "text-green-600" : "text-amber-600"}>
                      {dca.slaScore}%
                    </span>
                  </div>
                  <Progress value={Number(dca.slaScore)} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
