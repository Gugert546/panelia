import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../../lib/firebase/client";
import { createUserWithEmailAndPassword } from "firebase/auth";



export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  

  const handleLogin = async () => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    alert(error.message);
  }
};

const handleRegister = async () => {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
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
        <button onClick={handleRegister}>
          Registrer bruker
        </button>
    </div>
  );
}