import { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase/client";
import { useAuth } from "../features/auth/useAuth";
import type { CSSProperties } from "react";

const panelStyle: CSSProperties = {
  position: "absolute",
  right: -6,
  marginTop: 12,
  minWidth: 282,
  padding: "16px 12px 14px",
  borderRadius: 22,
  zIndex: 1000,
  background: "rgba(255, 255, 255, 0.15)",
  border: "1px solid rgba(214, 233, 255, 0.18)",
  boxShadow: "0 22px 48px rgba(10, 19, 37, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
  backdropFilter: "blur(16px)",
};

const actionButtonStyle: CSSProperties = {
  width: "100%",
  height: 54,
  borderRadius: 20,
  border: "1px solid rgba(255, 255, 255, 0.7)",
  background: "#ffffff",
  color: "rgba(41, 47, 58, 0.95)",
  fontSize: "inherit",
  fontFamily: "inherit",
  fontWeight: 500,
  cursor: "pointer",
  marginBottom: 10,
};

const userButtonStyle: CSSProperties = {
  width: "100%",
  height: 50,
  borderRadius: 16,
  border: "1px solid rgba(255, 255, 255, 0.7)",
  background: "#ffffff",
  color: "rgba(41, 47, 58, 0.95)",
  fontSize: "inherit",
  fontFamily: "inherit",
  cursor: "pointer",
};

export default function AuthMenu() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();


 

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
        <div style={panelStyle}>
          {!user ? (
            <>
              <button
                onClick={handleGoogleLogin}
                style={{
                  ...actionButtonStyle,
                  marginBottom: 0,
                }}
              >
                Logg inn med google
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  marginBottom: 10,
                  color: "rgba(227, 239, 255, 0.94)",
                  fontSize: "inherit",
                  fontFamily: "inherit",
                }}
              >
                {user.displayName}
              </div>
              <button
                onClick={handleLogout}
                style={userButtonStyle}
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