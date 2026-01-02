import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import CaseManagement from "@/pages/CaseManagement";
import ExcelUpload from "@/pages/ExcelUpload";
import DcaManagement from "@/pages/DcaManagement";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/cases" component={CaseManagement} />
      <Route path="/dcas" component={DcaManagement} />
      <Route path="/upload" component={ExcelUpload} />
      {/* Route History to Upload for MVP simplicity */}
      <Route path="/history" component={ExcelUpload} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 lg:ml-64 bg-background/50 relative">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
