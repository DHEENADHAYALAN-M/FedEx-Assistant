import { useState } from "react";
import { useCases } from "@/hooks/use-cases";
import { useDcas } from "@/hooks/use-dcas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, RefreshCw, FileText } from "lucide-react";
import CaseDetailView from "@/components/CaseDetailView";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function CaseManagement() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);

  const { data: cases, isLoading, refetch, isRefetching } = useCases({ 
    search, 
    status: statusFilter 
  });

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'High': return 'bg-red-100 text-red-700 hover:bg-red-200';
      case 'Medium': return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
      default: return 'bg-green-100 text-green-700 hover:bg-green-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'New': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'In Progress': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Recovered': return 'text-green-600 bg-green-50 border-green-200';
      case 'Escalated': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Case Management</h1>
          <p className="text-muted-foreground mt-1">View, track, and update debt collection cases.</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="gap-2" disabled={isRefetching}>
          <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by Customer Name or Case ID..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Recovered">Recovered</SelectItem>
              <SelectItem value="Escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 border border-border rounded-xl bg-card overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="font-semibold">Case ID</TableHead>
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Priority</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Assigned DCA</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading Skeleton
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : cases?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No cases found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                cases?.map((item) => (
                  <TableRow 
                    key={item.id} 
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setSelectedCaseId(item.id)}
                  >
                    <TableCell className="font-mono text-xs">{item.caseIdentifier}</TableCell>
                    <TableCell className="font-medium">{item.customerName}</TableCell>
                    <TableCell>${Number(item.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={cn("rounded-md px-2 py-0.5", getPriorityColor(item.priority))}>
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border", getStatusColor(item.status))}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.dcaName || "Unassigned"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Case Details Dialog */}
      <Dialog open={!!selectedCaseId} onOpenChange={(open) => !open && setSelectedCaseId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedCaseId && <CaseDetailView caseId={selectedCaseId} onClose={() => setSelectedCaseId(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
