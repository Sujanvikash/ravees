import { createContext, useContext } from 'react';

/** The signed-in login ({ username, role, location }), for parts of the page that need it without prop drilling. */
export const SessionContext = createContext(null);

export const useSession = () => useContext(SessionContext);
