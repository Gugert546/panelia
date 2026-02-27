import { useState } from "react";
import { signInWithRedirect, signOut } from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase/client";
import { useAuth } from "../features/auth/useAuth";

export default function AuthMenu() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const handleGoogleLogin = async () => {
  await signInWithRedirect(auth, googleProvider);
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
            <button
              onClick={handleGoogleLogin}
              style={{
                width: "100%",
                padding: 8,
                cursor: "pointer",
              }}
            >
              Logg inn med Google
            </button>
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