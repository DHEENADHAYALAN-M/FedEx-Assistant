import { Bell, Shield, Building2, ChevronDown, Menu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/hooks/use-role.tsx";
import { useDcas } from "@/hooks/use-dcas";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "./Sidebar";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const { role, setRole, selectedDcaId, setSelectedDcaId } = useRole();
  const { data: dcas } = useDcas();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const selectedDca = dcas?.find(d => d.id === selectedDcaId);

  const notifications = [
    { id: 1, title: "New Batch Uploaded", time: "2m ago", read: false },
    { id: 2, title: "SLA Threshold Warning", time: "1h ago", read: false },
    { id: 3, title: "Recovery Target Met", time: "3h ago", read: true },
  ];

  return (
    <header className="h-16 border-b border-border bg-card px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm ml-0 lg:ml-64">
      <div className="flex items-center gap-4">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-card border-r border-border">
            <div className="flex h-16 items-center px-6 border-b border-border bg-primary">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-white" />
                <span className="text-xl font-display font-bold text-white tracking-wide">DebtFlow</span>
              </div>
            </div>
            <SidebarContent onItemClick={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        
        <h2 className="text-lg font-semibold text-foreground hidden md:block">
          Welcome back, {role === "admin" ? "Admin" : selectedDca?.name || "Agency Partner"}
        </h2>
        <div className="flex items-center gap-2 lg:hidden">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-foreground">DebtFlow</span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Role Simulator */}
        <div className="flex items-center gap-2 bg-muted px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-xs md:text-sm font-semibold text-foreground hover:text-primary transition-colors focus:outline-none">
                {role === "admin" ? <Shield className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                <span className="hidden sm:inline">
                  {role === "admin" ? "Admin View" : `DCA: ${selectedDca?.name || "Select Agency"}`}
                </span>
                <span className="sm:hidden">
                  {role === "admin" ? "Admin" : "DCA"}
                </span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Simulate User Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={role} onValueChange={(v) => setRole(v as any)}>
                <DropdownMenuRadioItem value="admin">FedEx Admin</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dca">DCA Partner</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              
              {role === "dca" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground font-bold">Select Agency</DropdownMenuLabel>
                  <DropdownMenuRadioGroup 
                    value={selectedDcaId?.toString()} 
                    onValueChange={(v) => setSelectedDcaId(Number(v))}
                  >
                    {dcas?.map(dca => (
                      <DropdownMenuRadioItem key={dca.id} value={dca.id.toString()}>
                        {dca.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-accent rounded-full border border-white"></span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3">
                <div className="flex items-center justify-between w-full">
                  <span className={cn("text-sm", !n.read && "font-bold")}>{n.title}</span>
                  {!n.read && <span className="h-2 w-2 bg-primary rounded-full" />}
                </div>
                <span className="text-xs text-muted-foreground">{n.time}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center text-xs text-primary font-medium cursor-pointer">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
