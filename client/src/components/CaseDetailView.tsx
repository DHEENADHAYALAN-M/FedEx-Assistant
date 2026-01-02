import { useState } from "react";
import { useCase, useUpdateCase, useCreateNote } from "@/hooks/use-cases";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { format } from "date-fns";
import { 
  Loader2, 
  User, 
  CreditCard, 
  Calendar, 
  MapPin, 
  MessageSquare,
  CheckCircle2
} from "lucide-react";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CaseDetailViewProps {
  caseId: number;
  onClose: () => void;
}

export default function CaseDetailView({ caseId, onClose }: CaseDetailViewProps) {
  const { data: caseDetails, isLoading } = useCase(caseId);
  const updateCase = useUpdateCase();
  const createNote = useCreateNote();
  const [newNote, setNewNote] = useState("");

  if (isLoading || !caseDetails) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleStatusChange = (value: string) => {
    updateCase.mutate({ id: caseId, status: value });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    createNote.mutate({ caseId, note: newNote }, {
      onSuccess: () => setNewNote("")
    });
  };

  return (
    <>
      <DialogHeader>
        <div className="flex items-start justify-between">
          <div>
            <DialogTitle className="text-2xl font-bold font-display">
              Case #{caseDetails.caseIdentifier}
            </DialogTitle>
            <DialogDescription className="text-base mt-1">
              Customer Details & Audit Trail
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Select 
              value={caseDetails.status} 
              onValueChange={handleStatusChange}
              disabled={updateCase.isPending}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Assigned">Assigned</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Recovered">Recovered</SelectItem>
                <SelectItem value="Escalated">Escalated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogHeader>

      <Separator className="my-4" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Info */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-primary">
            <User className="h-4 w-4" /> Customer Information
          </h4>
          <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{caseDetails.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <CreditCard className="h-3 w-3" /> Amount Due:
              </span>
              <span className="font-bold text-red-600 text-lg">${Number(caseDetails.amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Days Overdue:
              </span>
              <Badge variant={Number(caseDetails.daysOverdue) > 90 ? "destructive" : "secondary"}>
                {caseDetails.daysOverdue} Days
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Region:
              </span>
              <span>{caseDetails.region}</span>
            </div>
          </div>

          <div className="pt-2">
             <h4 className="font-semibold mb-2">Assigned Agency</h4>
             {caseDetails.dca ? (
               <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card">
                 <div className="h-8 w-8 bg-accent/10 rounded-full flex items-center justify-center text-accent font-bold text-xs">
                   {caseDetails.dca.name.substring(0, 2).toUpperCase()}
                 </div>
                 <div className="flex flex-col">
                   <span className="font-medium text-sm">{caseDetails.dca.name}</span>
                   <span className="text-xs text-muted-foreground">{caseDetails.dca.region} Region</span>
                 </div>
               </div>
             ) : (
               <div className="text-sm text-muted-foreground italic p-2 border border-dashed rounded bg-muted/20">
                 No agency assigned yet.
               </div>
             )}
          </div>
        </div>

        {/* Audit Trail / Notes */}
        <div className="flex flex-col h-[400px]">
          <h4 className="font-semibold flex items-center gap-2 text-primary mb-3">
            <MessageSquare className="h-4 w-4" /> Activity Log
          </h4>
          
          <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/10 mb-4">
            {caseDetails.notes && caseDetails.notes.length > 0 ? (
              <div className="space-y-4">
                {caseDetails.notes.map((note) => (
                  <div key={note.id} className="flex gap-3">
                    <div className={cn(
                      "w-1 self-stretch rounded-full",
                      note.isSystemGenerated ? "bg-gray-300" : "bg-primary"
                    )}></div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={cn(
                          "text-xs font-semibold",
                          note.isSystemGenerated ? "text-muted-foreground" : "text-primary"
                        )}>
                          {note.isSystemGenerated ? "System" : "Agent"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(note.createdAt!), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {note.note}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10 text-sm">
                No activity recorded yet.
              </div>
            )}
          </ScrollArea>

          <form onSubmit={handleAddNote} className="flex gap-2">
            <Textarea 
              placeholder="Add a note..." 
              className="resize-none h-20 text-sm"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <Button 
              type="submit" 
              className="h-20 w-20 flex-col gap-1"
              disabled={createNote.isPending || !newNote.trim()}
            >
              {createNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              <span className="text-xs">Save</span>
            </Button>
          </form>
        </div>
      </div>
      
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </>
  );
}
