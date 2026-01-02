import { createContext, useContext, useState, useEffect } from "react";

type Role = "admin" | "dca";

interface RoleContextType {
  role: Role;
  selectedDcaId: number | null;
  setRole: (role: Role) => void;
  setSelectedDcaId: (id: number | null) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    return (localStorage.getItem("user-role") as Role) || "admin";
  });
  const [selectedDcaId, setSelectedDcaId] = useState<number | null>(() => {
    const saved = localStorage.getItem("selected-dca-id");
    return saved ? Number(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem("user-role", role);
  }, [role]);

  useEffect(() => {
    if (selectedDcaId) {
      localStorage.setItem("selected-dca-id", selectedDcaId.toString());
    } else {
      localStorage.removeItem("selected-dca-id");
    }
  }, [selectedDcaId]);

  return (
    <RoleContext.Provider value={{ role, selectedDcaId, setRole, setSelectedDcaId }}>
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
