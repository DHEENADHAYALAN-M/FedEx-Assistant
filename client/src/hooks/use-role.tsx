import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Role = "admin" | "dca";

interface RoleContextType {
  role: Role;
  selectedDcaId: number | null;
  setRole: (role: Role) => void;
  setSelectedDcaId: (id: number | null) => void;
  isLoading: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<Role>("admin");
  const [selectedDcaId, setSelectedDcaId] = useState<number | null>(null);

  useEffect(() => {
    // Simulate initial loading and hydrate from localStorage
    const hydrate = () => {
      const savedRole = localStorage.getItem("user-role") as Role;
      if (savedRole) setRole(savedRole);
      
      const savedDcaId = localStorage.getItem("selected-dca-id");
      if (savedDcaId) setSelectedDcaId(Number(savedDcaId));
      
      setTimeout(() => setIsLoading(false), 800);
    };

    hydrate();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem("user-role", role);
    }
  }, [role, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      if (selectedDcaId) {
        localStorage.setItem("selected-dca-id", selectedDcaId.toString());
      } else {
        localStorage.removeItem("selected-dca-id");
      }
    }
  }, [selectedDcaId, isLoading]);

  return (
    <RoleContext.Provider value={{ role, selectedDcaId, setRole, setSelectedDcaId, isLoading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
