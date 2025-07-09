
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export interface UserData extends DocumentData {
  uid: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  panCardNumber: string;
  address: string;
  mpin: string;
  profilePictureUrl: string;
  accountBalance: number;
  commissionPaid: number;
  role: 'user' | 'admin';
  accountStatus: 'active' | 'inactive';
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        // User is signed in, listen for their data
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data() as UserData;
            // If user is marked inactive, sign them out immediately.
            if (data.accountStatus === 'inactive' && auth.currentUser) {
              signOut(auth);
              setUserData(null);
            } else {
              setUserData(data);
            }
          } else {
            setUserData(null);
          }
          setLoading(false);
        }, (error) => {
            console.error("Error fetching user data:", error);
            setUserData(null);
            setLoading(false);
        });
        
        // Return the snapshot listener's unsubscribe function
        return () => unsubscribeSnapshot();
      } else {
        // User is signed out
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  if (!isFirebaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-center">
        <div className="w-full max-w-lg rounded-lg border border-destructive p-6 shadow-lg">
          <h1 className="text-xl font-bold text-destructive">Firebase Configuration Error</h1>
          <p className="mt-2 text-card-foreground">
            The application is not connected to Firebase. This is usually due to missing or incorrect environment variables.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Please ensure you have a <code className="font-mono text-primary bg-muted px-1 py-0.5 rounded">.env.local</code> file in your project root with the correct Firebase credentials. You may need to restart the server after creating the file.
          </p>
        </div>
      </div>
    );
  }

  const value = { user, userData, loading };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
