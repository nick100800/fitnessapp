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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      // Check if user is a trainer
      if (user) {
        const { data: trainer } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", user.id)
          .single();

        setUserRole(trainer ? "trainer" : "client");
      }

      setLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        // Check if user is a trainer
        const { data: trainer } = await supabase
          .from("trainers")
          .select("*")
          .eq("user_id", session.user.id)
          .single();

        setUserRole(trainer ? "trainer" : "client");
      } else {
        setUserRole(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      // Attempt normal sign out
      await supabase.auth.signOut();

      // Forcefully remove any lingering session token
      localStorage.removeItem("supabase.auth.token");

      // Reset local state
      setUser(null);
      setUserRole(null);
      setCurrentView("login");
    } catch (error) {
      console.error("Error signing out:", error);
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
                  <button
                    className={currentView === "book" ? "active" : ""}
                    onClick={() => setCurrentView("book")}
                  >
                    Book Session
                  </button>
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
        {!user ? (
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
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      console.log("Fetching sessions...");
      const { data, error } = await supabase
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

      console.log("Sessions data:", data);
      console.log("Sessions error:", error);

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setLoading(false);
    }
  };

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
    return <div className="loading">Loading available sessions...</div>;
  }

  return (
    <div className="booking-container">
      <h2>Available Training Sessions</h2>
      {sessions.length === 0 ? (
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
