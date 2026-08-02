import React, {createContext, useContext} from 'react';

import type {DatabaseGateway} from '../../services/db/gateway';

const DatabaseContext = createContext<DatabaseGateway | null>(null);

export interface DatabaseProviderProps {
  gateway: DatabaseGateway;
  children: React.ReactNode;
}

/**
 * The handle is opened once in the composition root and handed down. Screens
 * never open their own: up to eight handles may exist at a time, and a second
 * one would be a second source of truth (Principle VII).
 */
export function DatabaseProvider({gateway, children}: DatabaseProviderProps) {
  return (
    <DatabaseContext.Provider value={gateway}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): DatabaseGateway {
  const gateway = useContext(DatabaseContext);
  if (!gateway) {
    // A programming error, not a user-facing state: the provider is mounted by
    // the composition root before any screen renders.
    throw new Error('useDatabase called outside DatabaseProvider');
  }
  return gateway;
}
