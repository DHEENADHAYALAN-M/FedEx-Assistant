import { Bell, Shield, Building2, ChevronDown } from "lucide-react";
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
import { useRole } from "@/hooks/use-role";
import { useDcas } from "@/hooks/use-dcas";

export function Header() {
  const { role, setRole, selectedDcaId, setSelectedDcaId } = useRole();
  const { data: dcas } = useDcas();

  const selectedDca = dcas?.find(d => d.id === selectedDcaId);

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm ml-0 lg:ml-64">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-foreground hidden md:block">
          Welcome back, {role === "admin" ? "Admin" : selectedDca?.name || "Agency Partner"}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Simulator */}
        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full border border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors focus:outline-none">
                {role === "admin" ? <Shield className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                {role === "admin" ? "Admin View" : `DCA: ${selectedDca?.name || "Select Agency"}`}
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

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-accent rounded-full border border-white"></span>
        </Button>
      </div>
    </header>
  );
}
