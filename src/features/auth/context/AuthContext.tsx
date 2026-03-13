import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@config/firebase";
import type { UserProfile } from "@shared/types/dnd";

// ── Context type ─────────────────────────────────────────────────

interface AuthContextValue {
  /** The Firebase Auth user (null while loading or if signed out) */
  user: User | null;
  /** The Firestore user profile */
  profile: UserProfile | null;
  /** True until the initial auth state has been resolved */
  loading: boolean;
  /** Sign in with email + password */
  login: (email: string, password: string) => Promise<void>;
  /** Create a new account with email + password */
  signup: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  /** Sign in with Google popup */
  loginWithGoogle: () => Promise<void>;
  /** Sign out */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch or create the Firestore profile
        const profileRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(profileRef);

        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          // First sign-in — create profile
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            displayName:
              firebaseUser.displayName ?? firebaseUser.email ?? "Adventurer",
            email: firebaseUser.email ?? "",
            role: "player",
            createdAt: Date.now(),
          };
          await setDoc(profileRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // ── Auth methods ─────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await updateProfile(credential.user, { displayName });

    // Create the Firestore profile immediately
    const newProfile: UserProfile = {
      uid: credential.user.uid,
      displayName,
      email,
      role: "player",
      createdAt: Date.now(),
    };
    await setDoc(doc(db, "users", credential.user.uid), newProfile);
    setProfile(newProfile);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, login, signup, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
