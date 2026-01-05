import { useState, useCallback } from "react";
import { useImportCases, useUploadLogs } from "@/hooks/use-cases";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  AlertCircle, 
  History
} from "lucide-react";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface PreviewData {
  Case_ID: string;
  Customer_Name: string;
  Amount: number;
  Days_Overdue: number;
  Region: string;
}

export default function ExcelUpload() {
  const [location] = useLocation();
  const isHistoryView = location === "/history";
  
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const importCases = useImportCases();
  const { data: logs } = useUploadLogs();
  const { toast } = useToast();

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv'))) {
      processFile(droppedFile);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a .xlsx or .csv file.",
        variant: "destructive"
      });
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setFile(file);
    setIsProcessing(true);
    setUploadProgress(20);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];

        setUploadProgress(60);

        // Simple validation mapping
        const mappedData = json.map(row => {
          const caseId = String(row['Case_ID'] || row['Case ID'] || '');
          const customerName = String(row['Customer_Name'] || row['Customer Name'] || '');
          const amount = Number(row['Amount'] || 0);
          const daysOverdue = Number(row['Days_Overdue'] || row['Days Overdue'] || 0);
          const region = String(row['Region'] || '');

          return {
            Case_ID: caseId,
            Customer_Name: customerName,
            Amount: amount,
            Days_Overdue: daysOverdue,
            Region: region,
            Status: 'New'
          };
        }).filter(item => item.Case_ID && item.Customer_Name); // Filter empty rows

        if (mappedData.length === 0) {
          throw new Error("No valid data found. Please check column headers.");
        }

        setPreviewData(mappedData.slice(0, 5)); // Preview first 5
        setIsProcessing(false);
        setUploadProgress(100);
      } catch (error: any) {
        setIsProcessing(false);
        setUploadProgress(0);
        setFile(null);
        toast({
          title: "Parse Error",
          description: error.message,
          variant: "destructive"
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpload = () => {
    if (!file) return;
    
    // Re-read file to send full data
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet) as any[];
      
      const casesToImport = json.map(row => ({
        Case_ID: String(row['Case_ID'] || row['Case ID'] || ''),
        Customer_Name: String(row['Customer_Name'] || row['Customer Name'] || ''),
        Amount: Number(row['Amount'] || 0),
        Days_Overdue: Number(row['Days_Overdue'] || row['Days Overdue'] || 0),
        Region: String(row['Region'] || 'Unknown'),
        Status: 'New'
      })).filter(c => c.Case_ID && c.Customer_Name);

      if (casesToImport.length === 0) {
        toast({
          title: "Import Error",
          description: "No valid cases found in file. Check column headers.",
          variant: "destructive"
        });
        return;
      }

      importCases.mutate({
        filename: file.name,
        cases: casesToImport
      }, {
        onSuccess: (data) => {
          toast({
            title: "Upload Successful",
            description: data.message,
          });
          setFile(null);
          setPreviewData([]);
          setUploadProgress(0);
        },
        onError: (error: any) => {
          toast({
            title: "Upload Failed",
            description: error.message || "Failed to upload cases",
            variant: "destructive"
          });
        }
      });
    };
    reader.readAsBinaryString(file);
  };

  if (isHistoryView) {
    return (
      <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Upload History</h1>
          <p className="text-muted-foreground mt-1">Review the status and records of previous bulk imports.</p>
        </div>

        <Card className="border-l-4 border-l-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> All Recent Uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {logs?.map((log) => (
                <div key={log.id} className="flex items-start gap-3 relative pb-6 border-l border-border last:border-0 last:pb-0 pl-4 ml-2">
                  <div className={cn(
                    "absolute -left-[21px] top-0 h-4 w-4 rounded-full border-2 border-background",
                    log.status === 'Success' ? "bg-green-500" : "bg-red-500"
                  )}></div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{log.filename}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{format(new Date(log.createdAt!), "MMM d, h:mm a")}</span>
                      <span>•</span>
                      <span className={log.status === 'Success' ? "text-green-600" : "text-red-600"}>
                        {log.recordsProcessed} records processed
                      </span>
                      <span>•</span>
                      <span className={cn(
                        "font-medium",
                        log.status === 'Success' ? "text-green-600" : "text-red-600"
                      )}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {!logs?.length && (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground">No uploads have been recorded yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-display text-foreground">Excel Upload</h1>
        <p className="text-muted-foreground mt-1">Bulk import cases from standardized Excel templates.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Upload Area */}
        <div className="space-y-6">
          <Card 
            className="border-2 border-dashed border-border bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Drag & Drop your file here</h3>
              <p className="text-sm text-muted-foreground mb-6">Supported formats: .xlsx, .csv (Max 10MB)</p>
              
              <div className="relative">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".xlsx,.csv"
                  onChange={handleFileSelect}
                  disabled={isProcessing || importCases.isPending}
                />
                <Button variant="secondary" disabled={isProcessing || importCases.isPending}>
                  Select File
                </Button>
              </div>
            </CardContent>
          </Card>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {file && !isProcessing && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                  File Preview: {file.name}
                </CardTitle>
                <CardDescription>
                  Previewing first 5 rows. Total rows detected: {(file.size / 100).toFixed(0)} approx.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden mb-6">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead>Case ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Region</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{row.Case_ID}</TableCell>
                          <TableCell>{row.Customer_Name}</TableCell>
                          <TableCell>${row.Amount}</TableCell>
                          <TableCell>{row.Region}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => { setFile(null); setPreviewData([]); }}>Cancel</Button>
                  <Button onClick={handleUpload} disabled={importCases.isPending}>
                    {importCases.isPending ? "Importing..." : "Confirm & Upload"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Template Requirement</AlertTitle>
            <AlertDescription>
              Ensure your Excel file has headers: <strong>Case_ID, Customer_Name, Amount, Days_Overdue, Region</strong>.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}