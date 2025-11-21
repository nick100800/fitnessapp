import { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState("home");
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        
        if (userError) {
          console.error("Error getting user:", userError);
          setUser(null);
          setUserRole(null);
          setLoading(false);
          return;
        }

        setUser(user);

        // Check if user is a trainer
        if (user) {
          try {
            const { data: trainer, error: trainerError } = await supabase
              .from("trainers")
              .select("*")
              .eq("user_id", user.id)
              .single();

            // If error is "PGRST116" (no rows returned), user is not a trainer - this is OK
            if (trainerError && trainerError.code !== "PGRST116") {
              console.error("Error checking trainer status:", trainerError);
            }

            setUserRole(trainer ? "trainer" : "client");
          } catch (err) {
            console.error("Error in trainer check:", err);
            // Default to client if trainer check fails
            setUserRole("client");
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Unexpected error in checkUser:", error);
        setUser(null);
        setUserRole(null);
        setLoading(false);
      }
    };

    // Add timeout to prevent infinite loading
    let isCompleted = false;
    const timeoutId = setTimeout(() => {
      if (!isCompleted) {
        console.warn("User check timed out, setting loading to false");
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    checkUser().finally(() => {
      isCompleted = true;
      clearTimeout(timeoutId);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        setUser(session?.user ?? null);

        if (session?.user) {
          try {
            // Check if user is a trainer
            const { data: trainer, error: trainerError } = await supabase
              .from("trainers")
              .select("*")
              .eq("user_id", session.user.id)
              .single();

            // If error is "PGRST116" (no rows returned), user is not a trainer - this is OK
            if (trainerError && trainerError.code !== "PGRST116") {
              console.error("Error checking trainer status:", trainerError);
            }

            setUserRole(trainer ? "trainer" : "client");
          } catch (err) {
            console.error("Error in trainer check:", err);
            setUserRole("client");
          }
        } else {
          setUserRole(null);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error in auth state change:", error);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      // Reset local state first to unblock UI
      setUser(null);
      setUserRole(null);
      setCurrentView("login");
      setLoading(false);

      // Attempt normal sign out (don't await if it hangs)
      supabase.auth.signOut().catch((err) => {
        console.error("Error during sign out:", err);
      });

      // Forcefully remove any lingering session tokens
      localStorage.removeItem("supabase.auth.token");
      // Clear all supabase-related localStorage items
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("sb-")) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Error signing out:", error);
      // Even if there's an error, reset the UI state
      setUser(null);
      setUserRole(null);
      setCurrentView("login");
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <h1>💪 FitBook</h1>
          <nav className="nav-buttons">
            {user ? (
              <>
                <button
                  className={currentView === "home" ? "active" : ""}
                  onClick={() => setCurrentView("home")}
                >
                  Home
                </button>
                {userRole === "trainer" ? (
                  <>
                    <button
                      className={
                        currentView === "trainer-dashboard" ? "active" : ""
                      }
                      onClick={() => setCurrentView("trainer-dashboard")}
                    >
                      My Sessions
                    </button>
                    <button
                      className={
                        currentView === "create-session" ? "active" : ""
                      }
                      onClick={() => setCurrentView("create-session")}
                    >
                      Create Session
                    </button>
                    <button
                      className={
                        currentView === "trainer-create-booking" ? "active" : ""
                      }
                      onClick={() => setCurrentView("trainer-create-booking")}
                    >
                      Create Booking
                    </button>
                    <button
                      className={currentView === "my-bookings" ? "active" : ""}
                      onClick={() => setCurrentView("my-bookings")}
                    >
                      View Bookings
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={currentView === "book" ? "active" : ""}
                      onClick={() => setCurrentView("book")}
                    >
                      Book Session
                    </button>
                    <button
                      className={currentView === "my-bookings" ? "active" : ""}
                      onClick={() => setCurrentView("my-bookings")}
                    >
                      My Bookings
                    </button>
                  </>
                )}
                <button
                  className={currentView === "profile" ? "active" : ""}
                  onClick={() => setCurrentView("profile")}
                >
                  Profile
                </button>
                <button onClick={handleSignOut} className="sign-out">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  className={currentView === "login" ? "active" : ""}
                  onClick={() => setCurrentView("login")}
                >
                  Login
                </button>
                <button
                  className={currentView === "register" ? "active" : ""}
                  onClick={() => setCurrentView("register")}
                >
                  Register
                </button>
                <button
                  className={currentView === "trainer-register" ? "active" : ""}
                  onClick={() => setCurrentView("trainer-register")}
                >
                  Become a Trainer
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="loading">
            Loading...
            <br />
            <button
              onClick={() => setLoading(false)}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                background: "#e53e3e",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Skip Loading
            </button>
          </div>
        ) : !user ? (
          currentView === "login" ? (
            <LoginView onViewChange={setCurrentView} />
          ) : currentView === "trainer-register" ? (
            <TrainerRegisterView onViewChange={setCurrentView} />
          ) : (
            <RegisterView onViewChange={setCurrentView} />
          )
        ) : (
          <AuthenticatedView
            currentView={currentView}
            user={user}
            userRole={userRole}
          />
        )}
      </main>
    </div>
  );
}

// Login Component
function LoginView({ onViewChange }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setMessage("Login timed out. Please try again.");
      }
    }, 30000); // 30 second timeout

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      clearTimeout(timeoutId);

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Login successful!");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setMessage("Unexpected error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Welcome Back! 🏋️</h2>
      <form onSubmit={handleLogin} className="auth-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>
      {message && <p className="message">{message}</p>}
      <p>
        Don't have an account?{" "}
        <button
          onClick={() => onViewChange("register")}
          className="link-button"
        >
          Register here
        </button>
      </p>
    </div>
  );
}

// Register Component
function RegisterView({ onViewChange }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setMessage("Registration timed out. Please try again.");
      }
    }, 30000); // 30 second timeout

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      clearTimeout(timeoutId);

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Registration successful! Please check your email to confirm your account."
        );
        // Reset form
        setEmail("");
        setPassword("");
        setFullName("");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setMessage("Unexpected error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Join FitBook! 💪</h2>
      <form onSubmit={handleRegister} className="auth-form">
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>
      {message && <p className="message">{message}</p>}
      <p>
        Already have an account?{" "}
        <button onClick={() => onViewChange("login")} className="link-button">
          Sign in here
        </button>
      </p>
    </div>
  );
}

// Authenticated User View
function AuthenticatedView({ currentView, user, userRole }) {
  switch (currentView) {
    case "home":
      return <HomeView user={user} userRole={userRole} />;
    case "book":
      return <BookingView user={user} />;
    case "my-bookings":
      return <MyBookingsView user={user} userRole={userRole} />;
    case "trainer-dashboard":
      return <TrainerDashboardView user={user} />;
    case "create-session":
      return <CreateSessionView user={user} />;
    case "trainer-create-booking":
      return <TrainerCreateBookingView user={user} />;
    case "profile":
      return <ProfileView user={user} />;
    default:
      return <HomeView user={user} userRole={userRole} />;
  }
}

// Home View
function HomeView({ user }) {
  return (
    <div className="home-container">
      <h2>
        Welcome, {user?.user_metadata?.full_name || "Fitness Enthusiast"}! 🏋️‍♀️
      </h2>
      <div className="welcome-cards">
        <div className="card">
          <h3>📅 Book a Session</h3>
          <p>Find and book training sessions with certified trainers</p>
        </div>
        <div className="card">
          <h3>👨‍💼 Meet Our Trainers</h3>
          <p>Professional trainers ready to help you reach your goals</p>
        </div>
        <div className="card">
          <h3>📊 Track Progress</h3>
          <p>Monitor your fitness journey and achievements</p>
        </div>
      </div>
    </div>
  );
}

// Booking View
function BookingView({ user }) {
  console.log("BookingView rendered");

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTrainer, setIsTrainer] = useState(false);

  useEffect(() => {
    // Check if user is a trainer
    const checkTrainer = async () => {
      try {
        const { data: trainer } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setIsTrainer(!!trainer);
      } catch (err) {
        setIsTrainer(false);
      }
    };
    checkTrainer();
  }, [user.id]);

  const fetchSessions = async () => {
    console.log("fetchSessions START");
    setError(null);

    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 15000)
      );

      const queryPromise = supabase
        .from("training_sessions")
        .select(
          `
        *,
        trainers:trainer_id (
          name,
          specialties,
          hourly_rate
        )
      `
        )
        .eq("status", "available")
        .order("session_date", { ascending: true });

      const { data, error: queryError } = await Promise.race([
        queryPromise,
        timeoutPromise,
      ]);

      console.log("data:", data);
      console.log("error:", queryError);

      if (queryError) throw queryError;

      setSessions(data || []);
    } catch (err) {
      console.error("FETCH ERROR:", err);
      setError(
        err.message === "Request timeout"
          ? "Request timed out. Please try again."
          : "Failed to load sessions. Please refresh the page."
      );
      setSessions([]); // Set empty array on error
    } finally {
      console.log("fetchSessions END → setLoading(false)");
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("useEffect fired — calling fetchSessions()");
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookSession = async (sessionId) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      const insertPromise = supabase.from("bookings").insert({
        session_id: sessionId,
        client_id: user.id,
        status: "pending",
      });

      const { error } = await Promise.race([insertPromise, timeoutPromise]);

      if (error) throw error;
      alert("Session booked successfully!");
      fetchSessions(); // Refresh the list
    } catch (error) {
      console.error("Error booking session:", error);
      alert(
        error.message === "Request timeout"
          ? "Booking timed out. Please try again."
          : "Failed to book session. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <div className="loading">
        Loading available sessions...
        <br />
        <button
          onClick={() => {
            setLoading(false);
            setError("Loading cancelled. Please refresh to try again.");
          }}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            background: "#e53e3e",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Cancel Loading
        </button>
      </div>
    );
  }

  if (isTrainer) {
    return (
      <div className="booking-container">
        <h2>Available Training Sessions</h2>
        <p style={{ color: "#e53e3e", padding: "1rem", background: "#fed7d7", borderRadius: "8px" }}>
          Trainers cannot book sessions. Please use the "Create Booking" page to create bookings for clients.
        </p>
      </div>
    );
  }

  return (
    <div className="booking-container">
      <h2>Available Training Sessions</h2>
      {error && (
        <div
          style={{
            background: "#fed7d7",
            color: "#c53030",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
          }}
        >
          <strong>Error:</strong> {error}
          <button
            onClick={fetchSessions}
            style={{
              marginLeft: "1rem",
              padding: "0.5rem 1rem",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}
      {sessions.length === 0 && !error ? (
        <p>No available sessions at the moment. Check back later!</p>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session) => (
            <div key={session.id} className="session-card">
              {/* Trainer Header */}
              <div className="trainer-header">
                <h3 className="trainer-name">{session.trainers?.name}</h3>
                <div className="trainer-specialties">
                  {session.trainers?.specialties?.map((specialty, index) => (
                    <span key={index} className="specialty-tag">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              {/* Session Details */}
              <div className="session-details">
                <div className="detail-row">
                  <span className="detail-label">📅 Date:</span>
                  <span className="detail-value">
                    {new Date(session.session_date).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">🕐 Time:</span>
                  <span className="detail-value">
                    {session.start_time} - {session.end_time}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">💪 Type:</span>
                  <span className="detail-value">
                    {session.session_type.charAt(0).toUpperCase() +
                      session.session_type.slice(1)}{" "}
                    Training
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">💰 Price:</span>
                  <span className="detail-value price">${session.price}</span>
                </div>
              </div>

              {/* Book Button */}
              <button
                onClick={() => bookSession(session.id)}
                className="book-button"
              >
                Book This Session
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Trainer Registration Component
function TrainerRegisterView({ onViewChange }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Helper function to ensure user exists in public.users table
  // This function checks if user exists and waits for trigger, or creates manually if needed
  const ensureUserExists = async (userId, email, fullName, maxRetries = 6) => {
    console.log("ensureUserExists: Starting, userId:", userId, "email:", email);
    
    // First, try a quick check (trigger should have fired immediately)
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .single();

      if (existingUser) {
        console.log("ensureUserExists: User found immediately in public.users");
        return { success: true };
      }
    } catch (err) {
      console.log("ensureUserExists: Initial check failed, will retry:", err);
    }
    
    // If not found, wait for trigger with shorter retries
    for (let i = 0; i < maxRetries; i++) {
      console.log(`ensureUserExists: Attempt ${i + 1}/${maxRetries}`);
      
      try {
        // Check if user exists in public.users (trigger should have created it)
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("id")
          .eq("id", userId)
          .single();

        if (existingUser) {
          console.log("ensureUserExists: User found in public.users");
          return { success: true };
        }

        // If user doesn't exist (PGRST116 = no rows returned)
        if (checkError && checkError.code === "PGRST116") {
          // Shorter wait times - exponential backoff but capped lower
          const waitTime = Math.min(300 * (i + 1), 2000); // 300ms, 600ms, 900ms, 1200ms, 1500ms, 2000ms max
          console.log(`ensureUserExists: User not found yet (attempt ${i + 1}), waiting ${waitTime}ms for trigger...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        } else if (checkError) {
          // Other error (not "not found")
          console.log("ensureUserExists: Check error:", checkError);
          if (i < maxRetries - 1) {
            const waitTime = Math.min(300 * (i + 1), 2000);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          } else {
            return { success: false, error: checkError };
          }
        }
      } catch (err) {
        console.error("ensureUserExists: Exception:", err);
        if (i < maxRetries - 1) {
          const waitTime = Math.min(300 * (i + 1), 2000);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        } else {
          return { success: false, error: err };
        }
      }
    }
    
    // If we get here, trigger didn't create the user after retries
    // Try manual insert ONLY if we have an active session
    console.log("ensureUserExists: Trigger didn't create user after retries");
    
    // Check if we have an active session (required for RLS)
    const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError || !currentUser || currentUser.id !== userId) {
      console.error("ensureUserExists: No active session or user mismatch");
      console.error("getUserError:", getUserError);
      console.error("currentUser:", currentUser);
      console.error("expected userId:", userId);
      return { 
        success: false, 
        error: new Error("Cannot create user profile: No active session. Please ensure the database trigger is working or contact support.") 
      };
    }
    
    console.log("ensureUserExists: Active session confirmed, attempting manual insert...");
    console.log("auth.uid():", currentUser.id);
    console.log("Inserting with id:", userId);
    console.log("Match:", currentUser.id === userId);
    
    try {
      const { data: insertData, error: insertError } = await supabase
        .from("users")
        .insert({
          id: userId,
          email: email,
          full_name: fullName,
        })
        .select();

      if (!insertError) {
        console.log("ensureUserExists: Manual insert successful", insertData);
        return { success: true };
      } else {
        console.error("ensureUserExists: Manual insert failed:", insertError);
        console.error("Insert error details:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        return { success: false, error: insertError };
      }
    } catch (insertErr) {
      console.error("ensureUserExists: Manual insert exception:", insertErr);
      return { success: false, error: insertErr };
    }
  };

  const handleTrainerRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    let timeoutId;
    let isCompleted = false;

    // Add timeout to prevent infinite loading - use a ref-like pattern
    timeoutId = setTimeout(() => {
      if (!isCompleted) {
        console.warn("Trainer registration timed out");
        setLoading(false);
        setMessage("Registration timed out. Please try again.");
        isCompleted = true;
      }
    }, 30000); // 30 second timeout

    try {
      console.log("Step 1: Clearing auth session...");
      // Clear any lingering auth session / token
      await supabase.auth.signOut();
      localStorage.removeItem("supabase.auth.token");

      console.log("Step 2: Signing up user...");
      // Attempt to sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (authError) {
        clearTimeout(timeoutId);
        isCompleted = true;
        console.error("Auth error:", authError);
        
        // Handle specific error cases
        if (authError.message?.includes("already registered") || authError.message?.includes("already exists")) {
          setMessage(`This email is already registered. Please login instead or use a different email.`);
        } else {
          setMessage(`Signup failed: ${authError.message}`);
        }
        setLoading(false);
        return;
      }

      if (!authData?.user?.id) {
        clearTimeout(timeoutId);
        isCompleted = true;
        console.error("No user ID returned");
        setMessage("Signup failed: No user returned from Supabase. Please try again.");
        setLoading(false);
        return;
      }

      console.log("Step 2.5: User created in auth.users, ID:", authData.user.id);

      // Check if email confirmation is required
      let hasActiveSession = !!authData.session;
      
      if (authData.user && !authData.session) {
        console.log("Email confirmation required - user created but not confirmed");
        console.log("Attempting to sign in to establish session for RLS...");
        
        // Try to sign in to establish a session (this allows RLS to work)
        // This works even if email confirmation is required in some Supabase configs
        try {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!signInError && signInData?.session) {
            console.log("Session established successfully");
            hasActiveSession = true;
          } else {
            console.log("Could not establish session (email confirmation may be required):", signInError?.message);
            // This is OK - trigger should still work
          }
        } catch (signInErr) {
          console.log("Sign in attempt failed (expected if email confirmation required):", signInErr);
          // This is OK - we'll rely on trigger
        }
        
        // Wait a bit for trigger to fire
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      
      // Verify we have auth context
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log("Current auth.uid():", currentUser?.id);
      console.log("Expected user ID:", authData.user.id);
      console.log("Match:", currentUser?.id === authData.user.id);

      console.log("Step 3: Ensuring user exists in public.users...", authData.user.id);
      // Ensure user exists in public.users table (wait for trigger or create manually)
      // Add timeout to prevent hanging - increased to 20 seconds to allow for retries
      let userCheck;
      try {
        const userCheckPromise = ensureUserExists(
          authData.user.id,
          email,
          fullName
        );
        
        const userCheckTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("User check timed out")), 20000)
        );
        
        userCheck = await Promise.race([userCheckPromise, userCheckTimeout]);
      } catch (timeoutError) {
        clearTimeout(timeoutId);
        isCompleted = true;
        console.error("User check timed out:", timeoutError);
        setMessage(
          `User profile check timed out. The trigger may not be working. Please contact support or try again later.`
        );
        setLoading(false);
        return;
      }

      if (!userCheck || !userCheck.success) {
        clearTimeout(timeoutId);
        isCompleted = true;
        console.error("User check failed:", userCheck?.error);
        const errorMsg = userCheck?.error?.message || userCheck?.message || "Unknown error";
        setMessage(
          `Failed to create user profile: ${errorMsg}. Please try again.`
        );
        setLoading(false);
        return;
      }

      console.log("Step 4: Creating trainer profile...");
      // Create trainer profile in DB
      const { error: trainerError } = await supabase.from("trainers").insert({
        user_id: authData.user.id,
        name: fullName,
        email: email,
        phone: phone || null,
        specialties: specialties.split(",").map((s) => s.trim()).filter((s) => s.length > 0),
        bio: bio || null,
        hourly_rate: parseFloat(hourlyRate) || 0,
      });

      if (trainerError) {
        clearTimeout(timeoutId);
        isCompleted = true;
        console.error("Trainer profile creation error:", trainerError);
        setMessage("Trainer profile creation failed: " + trainerError.message);
        setLoading(false);
        return;
      }

      clearTimeout(timeoutId);
      isCompleted = true;
      console.log("Step 5: Registration successful!");
      setMessage(
        "Trainer registration successful! Check your email to confirm your account."
      );
      
      // Reset form after successful registration
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
      setSpecialties("");
      setBio("");
      setHourlyRate("");
    } catch (error) {
      clearTimeout(timeoutId);
      isCompleted = true;
      console.error("Unexpected error during registration:", error);
      setMessage("Unexpected error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Become a Trainer! 🏋️‍♂️</h2>
      <form onSubmit={handleTrainerRegister} className="auth-form">
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="tel"
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          type="text"
          placeholder="Specialties (comma-separated, e.g., Weight Training, Yoga)"
          value={specialties}
          onChange={(e) => setSpecialties(e.target.value)}
          required
        />
        <textarea
          placeholder="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows="3"
        />
        <input
          type="number"
          placeholder="Hourly Rate ($)"
          value={hourlyRate}
          onChange={(e) => setHourlyRate(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Creating Trainer Account..." : "Become a Trainer"}
        </button>
      </form>
      {message && <p className="message">{message}</p>}
      <p>
        Already have an account?{" "}
        <button onClick={() => onViewChange("login")} className="link-button">
          Sign in here
        </button>
      </p>
    </div>
  );
}

// Trainer Dashboard View
function TrainerDashboardView({ user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrainerSessions();
  }, []);

  const fetchTrainerSessions = async () => {
    setLoading(true);
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
      console.warn("Fetch trainer sessions timed out");
    }, 20000); // 20 second timeout

    try {
      // First get trainer_id from trainers table
      const { data: trainerData, error: trainerError } = await supabase
        .from("trainers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (trainerError) {
        clearTimeout(timeoutId);
        if (trainerError.code !== "PGRST116") {
          console.error("Error fetching trainer:", trainerError);
        }
        setSessions([]);
        setLoading(false);
        return;
      }

      if (!trainerData) {
        clearTimeout(timeoutId);
        setSessions([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("training_sessions")
        .select(
          `
          *,
          bookings (
            id,
            client_id,
            status,
            booking_date,
            users:client_id (
              full_name,
              email
            )
          )
        `
        )
        .eq("trainer_id", trainerData.id)
        .order("session_date", { ascending: true });

      clearTimeout(timeoutId);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Error fetching sessions:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const updateSessionStatus = async (sessionId, newStatus) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      const updatePromise = supabase
        .from("training_sessions")
        .update({ status: newStatus })
        .eq("id", sessionId);

      const { error } = await Promise.race([updatePromise, timeoutPromise]);

      if (error) throw error;
      fetchTrainerSessions();
    } catch (error) {
      console.error("Error updating session:", error);
      alert("Failed to update session status. Please try again.");
    }
  };

  const confirmBooking = async (bookingId) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      const updatePromise = supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId);

      const { error } = await Promise.race([updatePromise, timeoutPromise]);

      if (error) throw error;
      alert("Booking confirmed successfully!");
      fetchTrainerSessions(); // Refresh to show updated status
    } catch (error) {
      console.error("Error confirming booking:", error);
      alert("Failed to confirm booking. Please try again.");
    }
  };

  if (loading) {
    return <div className="loading">Loading your sessions...</div>;
  }

  return (
    <div className="trainer-dashboard">
      <h2>My Training Sessions</h2>
      {sessions.length === 0 ? (
        <p>
          No sessions created yet.{" "}
          <a href="#create-session">Create your first session!</a>
        </p>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session) => (
            <div key={session.id} className="session-card trainer-session">
              <h3>{new Date(session.session_date).toLocaleDateString()}</h3>
              <p>
                <strong>Time:</strong> {session.start_time} - {session.end_time}
              </p>
              <p>
                <strong>Type:</strong> {session.session_type}
              </p>
              <p>
                <strong>Price:</strong> ${session.price}
              </p>
              <p>
                <strong>Status:</strong> {session.status}
              </p>

              {session.bookings && session.bookings.length > 0 && (
                <div className="bookings">
                  <h4>Bookings:</h4>
                  {session.bookings.map((booking) => (
                    <div key={booking.id} className="booking-item" style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                      <p>
                        <strong>Client:</strong>{" "}
                        {booking.users?.full_name || booking.users?.email || "Unknown"}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        <span style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          background: booking.status === "confirmed" ? "#c6f6d5" : booking.status === "cancelled" ? "#fed7d7" : "#feebc8",
                          color: booking.status === "confirmed" ? "#22543d" : booking.status === "cancelled" ? "#c53030" : "#744210"
                        }}>
                          {booking.status}
                        </span>
                      </p>
                      <p>
                        <strong>Booked:</strong>{" "}
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </p>
                      {booking.status === "pending" && (
                        <button
                          onClick={() => confirmBooking(booking.id)}
                          style={{
                            marginTop: "0.5rem",
                            padding: "0.5rem 1rem",
                            background: "#48bb78",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          Confirm Booking
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="session-actions">
                <button
                  onClick={() => updateSessionStatus(session.id, "cancelled")}
                  className="cancel-button"
                >
                  Cancel Session
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Trainer Create Booking View
function TrainerCreateBookingView({ user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [clients, setClients] = useState([]);

  useEffect(() => {
    fetchAvailableSessions();
    fetchClients();
  }, []);

  const fetchAvailableSessions = async () => {
    setError(null);
    setLoading(true);

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError("Request timed out. Please try again.");
    }, 20000); // 20 second timeout

    try {
      // Get trainer_id from trainers table
      const { data: trainerData, error: trainerError } = await supabase
        .from("trainers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (trainerError) {
        clearTimeout(timeoutId);
        setError("Trainer profile not found");
        setLoading(false);
        return;
      }

      if (!trainerData) {
        clearTimeout(timeoutId);
        setError("Trainer profile not found");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("training_sessions")
        .select(
          `
          *,
          trainers:trainer_id (
            name,
            specialties,
            hourly_rate
          )
        `
        )
        .eq("trainer_id", trainerData.id)
        .eq("status", "available")
        .order("session_date", { ascending: true });

      clearTimeout(timeoutId);

      if (queryError) throw queryError;
      setSessions(data || []);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("FETCH ERROR:", err);
      setError("Failed to load sessions. Please refresh the page.");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      // Get all users who are not trainers
      const { data: trainers, error: trainerError } = await supabase
        .from("trainers")
        .select("user_id");

      if (trainerError) throw trainerError;

      const trainerUserIds = trainers.map((t) => t.user_id);

      // Fetch all users, then filter out trainers
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, full_name, email");

      if (usersError) throw usersError;
      
      // Filter out trainers
      const clientList = (usersData || []).filter(
        (user) => !trainerUserIds.includes(user.id)
      );
      
      setClients(clientList);
    } catch (err) {
      console.error("Error fetching clients:", err);
    }
  };

  const createBooking = async (sessionId) => {
    if (!selectedClientId) {
      alert("Please select a client first");
      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      const insertPromise = supabase.from("bookings").insert({
        session_id: sessionId,
        client_id: selectedClientId,
        status: "pending",
      });

      const { error } = await Promise.race([insertPromise, timeoutPromise]);

      if (error) throw error;
      alert("Booking created successfully!");
      fetchAvailableSessions(); // Refresh the list
    } catch (error) {
      console.error("Error creating booking:", error);
      alert(
        error.message === "Request timeout"
          ? "Booking creation timed out. Please try again."
          : "Failed to create booking. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <div className="loading">
        Loading available sessions...
      </div>
    );
  }

  return (
    <div className="booking-container">
      <h2>Create Booking for Client</h2>
      
      <div style={{ marginBottom: "2rem" }}>
        <label htmlFor="client-select" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
          Select Client:
        </label>
        <select
          id="client-select"
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem",
            fontSize: "1rem",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        >
          <option value="">-- Select a client --</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.full_name || client.email}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          style={{
            background: "#fed7d7",
            color: "#c53030",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
          }}
        >
          <strong>Error:</strong> {error}
          <button
            onClick={fetchAvailableSessions}
            style={{
              marginLeft: "1rem",
              padding: "0.5rem 1rem",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}
      {sessions.length === 0 && !error ? (
        <p>No available sessions at the moment. Create a session first!</p>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session) => (
            <div key={session.id} className="session-card">
              <div className="trainer-header">
                <h3 className="trainer-name">{session.trainers?.name}</h3>
                <div className="trainer-specialties">
                  {session.trainers?.specialties?.map((specialty, index) => (
                    <span key={index} className="specialty-tag">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              <div className="session-details">
                <div className="detail-row">
                  <span className="detail-label">📅 Date:</span>
                  <span className="detail-value">
                    {new Date(session.session_date).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">🕐 Time:</span>
                  <span className="detail-value">
                    {session.start_time} - {session.end_time}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">💪 Type:</span>
                  <span className="detail-value">
                    {session.session_type.charAt(0).toUpperCase() +
                      session.session_type.slice(1)}{" "}
                    Training
                  </span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">💰 Price:</span>
                  <span className="detail-value price">${session.price}</span>
                </div>
              </div>

              <button
                onClick={() => createBooking(session.id)}
                className="book-button"
                disabled={!selectedClientId}
              >
                Create Booking
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Create Session View
function CreateSessionView({ user }) {
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sessionType, setSessionType] = useState("personal");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setMessage("Session creation timed out. Please try again.");
      }
    }, 30000); // 30 second timeout

    try {
      // First get trainer_id from trainers table
      const { data: trainerData, error: trainerError } = await supabase
        .from("trainers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (trainerError) {
        clearTimeout(timeoutId);
        setMessage("Trainer profile not found. Please contact support.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("training_sessions").insert({
        trainer_id: trainerData.id,
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        session_type: sessionType,
        price: parseFloat(price) || 0,
        notes: notes || null,
        status: "available",
      });

      clearTimeout(timeoutId);

      if (error) throw error;
      setMessage("Session created successfully!");

      // Reset form
      setSessionDate("");
      setStartTime("");
      setEndTime("");
      setPrice("");
      setNotes("");
    } catch (error) {
      clearTimeout(timeoutId);
      setMessage(error.message || "Failed to create session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-session-container">
      <h2>Create New Training Session</h2>
      <form onSubmit={handleCreateSession} className="session-form">
        <div className="form-row">
          <input
            type="date"
            placeholder="Session Date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            required
          />
          <input
            type="time"
            placeholder="Start Time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
          <input
            type="time"
            placeholder="End Time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>

        <select
          value={sessionType}
          onChange={(e) => setSessionType(e.target.value)}
          required
        >
          <option value="personal">Personal Training</option>
          <option value="group">Group Training</option>
          <option value="virtual">Virtual Training</option>
        </select>

        <input
          type="number"
          placeholder="Price ($)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <textarea
          placeholder="Session Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="3"
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating Session..." : "Create Session"}
        </button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
}

// My Bookings View
function MyBookingsView({ user, userRole }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookings = async () => {
    setError(null);
    setLoading(true);

    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 15000)
      );

      let queryPromise;

      if (userRole === "trainer") {
        // For trainers, get bookings for their sessions
        // First get trainer_id
        const { data: trainerData, error: trainerError } = await supabase
          .from("trainers")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (trainerError) throw trainerError;
        if (!trainerData) {
          setLoading(false);
          return;
        }

        // Get all sessions for this trainer, then get bookings for those sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("training_sessions")
          .select("id")
          .eq("trainer_id", trainerData.id);

        if (sessionsError) throw sessionsError;

        const sessionIds = sessionsData.map((s) => s.id);

        if (sessionIds.length === 0) {
          setBookings([]);
          setLoading(false);
          return;
        }

        queryPromise = supabase
          .from("bookings")
          .select(
            `
            *,
            training_sessions:session_id (
              id,
              session_date,
              start_time,
              end_time,
              session_type,
              price,
              trainers:trainer_id (
                name,
                specialties
              )
            ),
            users:client_id (
              full_name,
              email
            )
          `
          )
          .in("session_id", sessionIds)
          .order("booking_date", { ascending: false });
      } else {
        // For clients, get their own bookings
        queryPromise = supabase
          .from("bookings")
          .select(
            `
            *,
            training_sessions:session_id (
              id,
              session_date,
              start_time,
              end_time,
              session_type,
              price,
              trainers:trainer_id (
                name,
                specialties
              )
            )
          `
          )
          .eq("client_id", user.id)
          .order("booking_date", { ascending: false });
      }

      const { data, error: queryError } = await Promise.race([
        queryPromise,
        timeoutPromise,
      ]);

      if (queryError) throw queryError;

      setBookings(data || []);
    } catch (err) {
      console.error("FETCH BOOKINGS ERROR:", err);
      setError(
        err.message === "Request timeout"
          ? "Request timed out. Please try again."
          : "Failed to load bookings. Please refresh the page."
      );
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      const updatePromise = supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId)
        .eq("client_id", user.id);

      const { error } = await Promise.race([updatePromise, timeoutPromise]);

      if (error) throw error;
      alert("Booking cancelled successfully!");
      fetchBookings(); // Refresh the list
    } catch (error) {
      console.error("Error cancelling booking:", error);
      alert(
        error.message === "Request timeout"
          ? "Cancellation timed out. Please try again."
          : "Failed to cancel booking. Please try again."
      );
    }
  };

  const confirmBookingFromView = async (bookingId) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      const updatePromise = supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId);

      const { error } = await Promise.race([updatePromise, timeoutPromise]);

      if (error) throw error;
      alert("Booking confirmed successfully!");
      fetchBookings(); // Refresh the list
    } catch (error) {
      console.error("Error confirming booking:", error);
      alert(
        error.message === "Request timeout"
          ? "Confirmation timed out. Please try again."
          : "Failed to confirm booking. Please try again."
      );
    }
  };

  if (loading) {
    return (
      <div className="loading">
        Loading your bookings...
        <br />
        <button
          onClick={() => {
            setLoading(false);
            setError("Loading cancelled. Please refresh to try again.");
          }}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            background: "#e53e3e",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Cancel Loading
        </button>
      </div>
    );
  }

  return (
    <div className="booking-container">
      <h2>{userRole === "trainer" ? "Session Bookings" : "My Bookings"}</h2>
      {error && (
        <div
          style={{
            background: "#fed7d7",
            color: "#c53030",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
          }}
        >
          <strong>Error:</strong> {error}
          <button
            onClick={fetchBookings}
            style={{
              marginLeft: "1rem",
              padding: "0.5rem 1rem",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}
      {bookings.length === 0 && !error ? (
        <p>{userRole === "trainer" ? "No bookings for your sessions yet." : "You haven't booked any sessions yet."}</p>
      ) : (
        <div className="sessions-grid">
          {bookings.map((booking) => {
            const session = booking.training_sessions;
            if (!session) return null;

            return (
              <div key={booking.id} className="session-card">
                <div className="trainer-header">
                  <h3 className="trainer-name">
                    {userRole === "trainer" 
                      ? (booking.users?.full_name || booking.users?.email || "Client")
                      : (session.trainers?.name || "Unknown Trainer")
                    }
                  </h3>
                  {userRole !== "trainer" && (
                    <div className="trainer-specialties">
                      {session.trainers?.specialties?.map((specialty, index) => (
                        <span key={index} className="specialty-tag">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="session-details">
                  <div className="detail-row">
                    <span className="detail-label">📅 Date:</span>
                    <span className="detail-value">
                      {new Date(session.session_date).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">🕐 Time:</span>
                    <span className="detail-value">
                      {session.start_time} - {session.end_time}
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">💪 Type:</span>
                    <span className="detail-value">
                      {session.session_type.charAt(0).toUpperCase() +
                        session.session_type.slice(1)}{" "}
                      Training
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">💰 Price:</span>
                    <span className="detail-value price">${session.price}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">
                      <span style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        background: booking.status === "confirmed" ? "#c6f6d5" : booking.status === "cancelled" ? "#fed7d7" : "#feebc8",
                        color: booking.status === "confirmed" ? "#22543d" : booking.status === "cancelled" ? "#c53030" : "#744210"
                      }}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Booked on:</span>
                    <span className="detail-value">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {userRole !== "trainer" && booking.status !== "cancelled" && booking.status !== "completed" && (
                  <button
                    onClick={() => cancelBooking(booking.id)}
                    className="cancel-button"
                    style={{
                      marginTop: "1rem",
                      padding: "0.75rem 1.5rem",
                      background: "#e53e3e",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Cancel Booking
                  </button>
                )}
                {userRole === "trainer" && booking.status === "pending" && (
                  <button
                    onClick={() => confirmBookingFromView(booking.id)}
                    style={{
                      marginTop: "1rem",
                      padding: "0.75rem 1.5rem",
                      background: "#48bb78",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Confirm Booking
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Profile View
function ProfileView({ user }) {
  return (
    <div className="profile-container">
      <h2>Your Profile</h2>
      <div className="profile-info">
        <p>
          <strong>Name:</strong> {user?.user_metadata?.full_name || "Not set"}
        </p>
        <p>
          <strong>Email:</strong> {user?.email}
        </p>
        <p>
          <strong>Member since:</strong>{" "}
          {new Date(user?.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

export default App;
