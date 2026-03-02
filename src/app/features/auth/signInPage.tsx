import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../lib/firebase/client";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("Innlogget!");
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div>
      <h2>Logg inn</h2>
      <input
        type="email"
        placeholder="E-post"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Passord"
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleLogin}>Logg inn</button>
    </div>
  );
}