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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Login successful!");
    }
    setLoading(false);
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        "Registration successful! Please check your email to confirm your account."
      );
    }
    setLoading(false);
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
      return <MyBookingsView user={user} />;
    case "trainer-dashboard":
      return <TrainerDashboardView user={user} />;
    case "create-session":
      return <CreateSessionView user={user} />;
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
      const { error } = await supabase.from("bookings").insert({
        session_id: sessionId,
        client_id: user.id,
        status: "pending",
      });

      if (error) throw error;
      alert("Session booked successfully!");
      fetchSessions(); // Refresh the list
    } catch (error) {
      console.error("Error booking session:", error);
      alert("Failed to book session. Please try again.");
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
  const [loading, setLoading] = useState(true);
  //11/17/2025 changed setLoading] = useState(false) to true
  const [message, setMessage] = useState("");

  const handleTrainerRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Clear any lingering auth session / token
      await supabase.auth.signOut();
      localStorage.removeItem("supabase.auth.token");

      // Attempt to sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      console.log("authData:", authData);
      console.log("authError:", authError);

      if (authError) {
        // Handle known errors
        setMessage(`Signup failed: ${authError.message}`);
        setLoading(false);
        return;
      }

      if (!authData?.user?.id) {
        setMessage("Signup failed: No user returned from Supabase.");
        setLoading(false);
        return;
      }

      // Create trainer profile in DB
      const { error: trainerError } = await supabase.from("trainers").insert({
        user_id: authData.user.id,
        name: fullName,
        email: email,
        phone: phone,
        specialties: specialties.split(",").map((s) => s.trim()),
        bio: bio,
        hourly_rate: parseFloat(hourlyRate),
      });

      if (trainerError) {
        // Rollback user creation if needed
        console.error("Trainer profile creation error:", trainerError);
        setMessage("Trainer profile creation failed: " + trainerError.message);
        setLoading(false);
        return;
      }

      setMessage(
        "Trainer registration successful! Check your email to confirm your account."
      );
    } catch (error) {
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
    try {
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
        .eq("trainer_id", user.id)
        .order("session_date", { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSessionStatus = async (sessionId, newStatus) => {
    try {
      const { error } = await supabase
        .from("training_sessions")
        .update({ status: newStatus })
        .eq("id", sessionId);

      if (error) throw error;
      fetchTrainerSessions();
    } catch (error) {
      console.error("Error updating session:", error);
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
                    <div key={booking.id} className="booking-item">
                      <p>
                        <strong>Client:</strong>{" "}
                        {booking.users?.full_name || "Unknown"}
                      </p>
                      <p>
                        <strong>Status:</strong> {booking.status}
                      </p>
                      <p>
                        <strong>Booked:</strong>{" "}
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </p>
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

    try {
      const { error } = await supabase.from("training_sessions").insert({
        trainer_id: user.id,
        session_date: sessionDate,
        start_time: startTime,
        end_time: endTime,
        session_type: sessionType,
        price: parseFloat(price),
        notes: notes,
        status: "available",
      });

      if (error) throw error;
      setMessage("Session created successfully!");

      // Reset form
      setSessionDate("");
      setStartTime("");
      setEndTime("");
      setPrice("");
      setNotes("");
    } catch (error) {
      setMessage(error.message);
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
function MyBookingsView({ user }) {
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

      const queryPromise = supabase
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
      <h2>My Bookings</h2>
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
        <p>You haven't booked any sessions yet.</p>
      ) : (
        <div className="sessions-grid">
          {bookings.map((booking) => {
            const session = booking.training_sessions;
            if (!session) return null;

            return (
              <div key={booking.id} className="session-card">
                <div className="trainer-header">
                  <h3 className="trainer-name">
                    {session.trainers?.name || "Unknown Trainer"}
                  </h3>
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

                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className="detail-value">{booking.status}</span>
                  </div>

                  <div className="detail-row">
                    <span className="detail-label">Booked on:</span>
                    <span className="detail-value">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
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
