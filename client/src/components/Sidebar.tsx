import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Briefcase, 
  Building2, 
  Upload, 
  History,
  ShieldCheck,
  Database,
  Cpu,
  Server
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Case Management", href: "/cases", icon: Briefcase },
  { name: "DCA Management", href: "/dcas", icon: Building2 },
  { name: "Excel Upload", href: "/upload", icon: Upload },
  { name: "Upload History", href: "/history", icon: History },
];

function SystemHealth() {
  const { data: health } = useQuery({
    queryKey: ["/api/admin/health"],
    refetchInterval: 10000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
      case "connected":
      case "operational":
        return "text-green-500";
      case "thinking":
        return "text-blue-500 animate-pulse";
      default:
        return "text-red-500";
    }
  };

  return (
    <div className="px-4 py-4 space-y-3">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-2">
        System Infrastructure
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/20">
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-medium">Database</span>
          </div>
          <div className={cn("h-1.5 w-1.5 rounded-full bg-current", getStatusColor(health?.db?.status || "disconnected"))} />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/20">
          <div className="flex items-center gap-2">
            <Cpu className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-medium">AI Core</span>
          </div>
          <div className={cn("h-1.5 w-1.5 rounded-full bg-current", getStatusColor(health?.ai?.status || "offline"))} />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/20">
          <div className="flex items-center gap-2">
            <Server className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-medium">Storage</span>
          </div>
          <span className="text-[9px] font-mono text-muted-foreground">{health?.storage?.mode || "Detecting..."}</span>
        </div>
      </div>
    </div>
  );
}

export function SidebarContent({ className, onItemClick }: { className?: string; onItemClick?: () => void }) {
  const [location] = useLocation();

  return (
    <div className={cn("flex flex-col gap-1 p-4", className)}>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4 mt-2">
        Menu
      </div>
      {navigation.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href}>
            <div
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer group",
                isActive
                  ? "bg-primary/10 text-primary border-r-4 border-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.name}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  return (
    <div className="hidden lg:flex flex-col w-64 border-r border-border bg-card min-h-screen fixed left-0 top-0 z-30 shadow-sm">
      <div className="flex h-16 items-center px-6 border-b border-border bg-primary">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-white" />
          <span className="text-xl font-display font-bold text-white tracking-wide">DebtFlow</span>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-y-auto">
        <SidebarContent />
      </div>

      <SystemHealth />
      
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">Admin User</span>
            <span className="text-xs text-muted-foreground">admin@debtflow.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
