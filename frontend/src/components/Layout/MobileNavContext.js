import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const Ctx = createContext({ open: false, setOpen: () => {} });

export function MobileNavProvider({ children }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMobileNav() {
  return useContext(Ctx);
}
