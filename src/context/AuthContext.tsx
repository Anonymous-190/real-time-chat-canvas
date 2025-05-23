
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User, createClient } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/sonner";

// Default to empty strings for development/testing
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase client
const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Log warning for missing credentials
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.");
}

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Display graceful message if Supabase is not initialized
  useEffect(() => {
    if (!supabase) {
      toast.error("Supabase connection not configured. Please connect to Supabase.");
      setLoading(false);
    }
  }, []);

  // Check for session on load
  useEffect(() => {
    if (!supabase) return;
    
    setLoading(true);
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      if (!supabase) {
        toast.error("Authentication service unavailable. Please connect to Supabase.");
        return;
      }
      
      setLoading(true);
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      // Add user metadata to users table if not exists
      if (data.user) {
        const { error: metadataError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            display_name: data.user.email?.split('@')[0] || 'User',
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (metadataError) {
          console.error('Error adding user metadata:', metadataError);
        }
      }
      
      navigate('/');
      toast.success("Successfully logged in!");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      if (!supabase) {
        toast.error("Authentication service unavailable. Please connect to Supabase.");
        return;
      }
      
      setLoading(true);
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          }
        }
      });
      
      if (error) throw error;

      // Add user to users table
      if (data.user) {
        const { error: metadataError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            display_name: displayName,
            created_at: new Date().toISOString(),
          });

        if (metadataError) {
          console.error('Error adding user:', metadataError);
        }
      }
      
      toast.success("Account created! Please check your email for verification.");
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (!supabase) {
        toast.error("Authentication service unavailable. Please connect to Supabase.");
        return;
      }
      
      setLoading(true);
      await supabase.auth.signOut();
      navigate('/login');
      toast.success("Successfully logged out!");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
