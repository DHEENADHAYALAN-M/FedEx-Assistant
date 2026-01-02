import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Bell, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
  const [role, setRole] = useState<"Admin" | "DCA">("Admin");

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm ml-0 lg:ml-64">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground hidden md:block">
          Welcome back, Admin
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Simulator */}
        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full border border-border">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">View As:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors focus:outline-none">
                {role} <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={() => setRole("Admin")}>
                Admin View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRole("DCA")}>
                DCA View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-accent rounded-full border border-white"></span>
        </Button>
      </div>
    </header>
  );
}
