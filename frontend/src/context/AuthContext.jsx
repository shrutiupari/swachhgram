import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, fetchUserAttributes, signOut } from "aws-amplify/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [attributes, setAttributes] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const u = await getCurrentUser();
      const attrs = await fetchUserAttributes();
      setUser(u);
      setAttributes(attrs);
    } catch {
      setUser(null);
      setAttributes(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUser(); }, []);

  const role = attributes?.["custom:role"] || "citizen";
  const email = attributes?.email || "";
  const name  = attributes?.name || user?.username || "";

  const logout = async () => {
    await signOut();
    setUser(null);
    setAttributes(null);
  };

  return (
    <AuthContext.Provider value={{ user, attributes, role, email, name, loading, logout, reload: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
