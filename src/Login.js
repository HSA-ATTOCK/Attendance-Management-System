import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    try {
      const trimmedEmail = email.trim();
      const res = await signInWithEmailAndPassword(auth, trimmedEmail, pass);
      const uid = res.user.uid;
      const userDoc = await getDoc(doc(db, "users", uid));
      const role = userDoc.data().role;
      if (role === "admin") navigate("/admin");
      else if (role === "teacher") navigate("/teacher");
      else setError("Invalid role");
    } catch (err) {
      setError("Login failed");
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={login}>
        <h2>Login</h2>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <button type="submit">Login</button>
        {error && <p>{error}</p>}
      </form>
    </div>
  );
};

export default Login;
