import React, { createContext, useContext, useState } from 'react';
import { ROLES } from '../data/mockData';

type RoleContextType = {
  selectedRole: string;
  setSelectedRole: (role: string) => void;
};

const RoleContext = createContext<RoleContextType>({
  selectedRole: ROLES[0],
  setSelectedRole: () => {},
});

// provider to wrap the app and provide role context
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);

  return (
    <RoleContext.Provider value={{ selectedRole, setSelectedRole }}>
      {children}
    </RoleContext.Provider>
  );
}

// hook to use role context
export function useRole() {
  return useContext(RoleContext);
}