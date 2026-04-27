import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../../lib/firebase/client";
import { deleteUserData } from "../../lib/firebase/firestore";
import {
  beginUserDataDeletion,
  endUserDataDeletion,
} from "../../lib/firebase/userDataDeletion";
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

const dangerButtonStyle: CSSProperties = {
  ...userButtonStyle,
  marginTop: 10,
  border: "1px solid rgba(248, 113, 113, 0.8)",
  background: "rgba(255, 241, 241, 0.96)",
  color: "#b91c1c",
};

const modalButtonStyle: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 14,
  fontFamily: "inherit",
  fontWeight: 600,
};

export default function AuthMenu() {
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!open || !user || deleteConfirmOpen) return;

    const closeTimer = window.setTimeout(() => {
      setOpen(false);
    }, 2500);

    return () => window.clearTimeout(closeTimer);
  }, [deleteConfirmOpen, open, user]);

  const handleGoogleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setOpen(false);
  };

  const handleOpenDeleteConfirm = () => {
    setDeleteError(null);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteData = async () => {
    if (!user) return;

    setDeletingData(true);
    setDeleteError(null);
    beginUserDataDeletion(user.uid);

    try {
      const deletedCount = await deleteUserData(user.uid);
      console.info(`Deleted ${deletedCount} Firestore documents for user ${user.uid}.`);
      await signOut(auth);
      endUserDataDeletion(user.uid);
      setDeleteConfirmOpen(false);
      setOpen(false);
    } catch (error) {
      console.error("Error deleting user data:", error);
      endUserDataDeletion(user.uid);
      setDeleteError("Kunne ikke slette dataene dine akkurat nå. Prøv igjen.");
    } finally {
      setDeletingData(false);
    }
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
                }}
              >
                Logg inn med google
              </button>
              <Link className="auth-menu-privacy-link" to="/privacy">
                Privacy Policy
              </Link>
              <Link className="auth-menu-privacy-link" to="/terms">
                Terms of Service
              </Link>
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
              <button
                onClick={handleOpenDeleteConfirm}
                style={dangerButtonStyle}
              >
                Slett mine data
              </button>
              <Link className="auth-menu-privacy-link" to="/privacy">
                Privacy Policy
              </Link>
              <Link className="auth-menu-privacy-link" to="/terms">
                Terms of Service
              </Link>
            </>
          )}
        </div>
      )}

      {deleteConfirmOpen && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(0,0,0,0.5)",
          }}
          onClick={() => {
            if (!deletingData) setDeleteConfirmOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-data-title"
            style={{
              width: "min(100%, 420px)",
              background: "#fff",
              borderRadius: 16,
              padding: "26px 28px",
              boxShadow: "0 18px 54px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="delete-user-data-title"
              style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}
            >
              Slett data?
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#475569" }}>
              Dette sletter lagrede widgets, layout, notater, bokmerker, kalenderhendelser og
              innstillinger fra databasen. Du blir logget ut etterpå.
            </p>
            {deleteError && (
              <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>
                {deleteError}
              </p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deletingData}
                style={{
                  ...modalButtonStyle,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  color: "#334155",
                  opacity: deletingData ? 0.6 : 1,
                }}
              >
                Avbryt
              </button>
              <button
                onClick={handleDeleteData}
                disabled={deletingData}
                style={{
                  ...modalButtonStyle,
                  border: "1px solid #dc2626",
                  background: "#dc2626",
                  color: "#fff",
                  opacity: deletingData ? 0.75 : 1,
                }}
              >
                {deletingData ? "Sletter..." : "Ja, slett data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
