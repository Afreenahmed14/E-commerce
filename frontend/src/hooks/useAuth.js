import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/** Convenience hook for accessing auth state/actions anywhere in the tree. */
export const useAuth = () => useContext(AuthContext);
