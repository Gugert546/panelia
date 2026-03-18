import { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase/client";
import { useAuth } from "../features/auth/useAuth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { createUserWithEmailAndPassword } from "firebase/auth";

export default function AuthMenu() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleEmailLogin = async () => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    setOpen(false);
  } catch (error: any) {
    alert(error.message);
  }
};

const handleRegister = async () => {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    setOpen(false);
  } catch (error: any) {
    alert(error.message);
  }
};

  const handleGoogleLogin = async () => {
  await signInWithPopup(auth, googleProvider);
};

  const handleLogout = async () => {
    await signOut(auth);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      
      {/* Profile Circle */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          overflow: "hidden",
          cursor: "pointer",
          backgroundColor: "#ccc",
          border: "2px solid white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {user?.photoURL ? (
  <img
    src={user.photoURL}
    alt="Profile"
    style={{
      width: "100%",
      height: "100%",
      objectFit: "cover",
    }}
  />
) : (
  <span
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      fontSize: 18,
      color: "#666",
    }}
  >
    👤
  </span>
)}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            marginTop: 10,
            background: "white",
            padding: 12,
            borderRadius: 10,
            boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
            minWidth: 180,
            zIndex: 1000,
          }}
        >
          {!user ? (
  <>
    <input
      type="email"
      placeholder="E-post"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      style={{ width: "100%", marginBottom: 6 }}
    />

    <input
      type="password"
      placeholder="Passord"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      style={{ width: "100%", marginBottom: 6 }}
    />

    <button
  onClick={handleEmailLogin}
  style={{ width: "100%", marginBottom: 6 }}
>
  Logg inn
</button>

<button
  onClick={handleRegister}
  style={{ width: "100%", marginBottom: 6 }}
>
  Registrer bruker
</button>

<button
  onClick={handleGoogleLogin}
  style={{ width: "100%" }}
>
  Logg inn med Google
</button>
  </>
) : (
            <>
              <div style={{ marginBottom: 8, fontSize: 14 }}>
                {user.displayName}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: 8,
                  cursor: "pointer",
                }}
              >
                Logg ut
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}