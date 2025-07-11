import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./TeacherDashboard.css";

const TeacherDashboard = () => {
  const [allowed, setAllowed] = useState(false);
  const [marked, setMarked] = useState(false);
  const [msg, setMsg] = useState("");
  const [ip, setIp] = useState("");
  const [records, setRecords] = useState([]);
  const navigate = useNavigate();

  const schoolIP = "58.65.217.209"; // Replace with your actual static IP

  // ✅ Check user IP against school IP
  const checkIP = async () => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      setIp(data.ip);
      setAllowed(data.ip === schoolIP);
    } catch {
      setIp("Unable to fetch");
      setAllowed(false);
    }
  };

  // ✅ Mark today's attendance
  const markAttendance = async () => {
    try {
      const uid = auth.currentUser.uid;
      const name = auth.currentUser.email;
      const today = new Date().toISOString().split("T")[0];

      const res = await fetch(
        "https://attendance-backend-9a7c.onrender.com/mark-attendance",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, name, date: today }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setMarked(true);
        setMsg("✅ Attendance marked!");
        fetchMyAttendance();
      } else {
        setMsg("⚠️ " + data.error);
      }
    } catch (err) {
      setMsg("❌ " + err.message);
    }
  };

  // ✅ Fetch past attendance
  const fetchMyAttendance = async () => {
    try {
      const uid = auth.currentUser.uid;
      const res = await fetch(
        `https://attendance-backend-9a7c.onrender.com/teacher-attendance/${uid}`
      );
      const data = await res.json();
      // ✅ Ensure data is an array
      if (Array.isArray(data)) {
        setRecords(data);
      } else {
        setRecords([]);
        setMsg("⚠️ Unexpected data format received.");
      }
    } catch (err) {
      setMsg("❌ Failed to fetch attendance history");
      setRecords([]);
    }
  };

  // ✅ FIXED: Complete timestamp formatting function that handles ALL formats
  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return "Not Available";

      let date;

      // Handle Firestore timestamp format (BOTH _seconds and seconds)
      if (timestamp._seconds !== undefined || timestamp.seconds !== undefined) {
        // Handle both client SDK format (_seconds) and server SDK format (seconds)
        const seconds = timestamp._seconds || timestamp.seconds;
        const nanoseconds =
          timestamp._nanoseconds || timestamp.nanoseconds || 0;

        // Convert to milliseconds
        const milliseconds = Math.floor(nanoseconds / 1000000);
        date = new Date(seconds * 1000 + milliseconds);
      }
      // Handle Unix timestamp (check if it's in seconds or milliseconds)
      else if (typeof timestamp === "number") {
        date =
          timestamp.toString().length === 10
            ? new Date(timestamp * 1000)
            : new Date(timestamp);
      }
      // Handle custom database format: "July 11, 2025 at 5:48:44 PM UTC+5"
      else if (
        typeof timestamp === "string" &&
        timestamp.includes(" at ") &&
        timestamp.includes("UTC")
      ) {
        const parts = timestamp.split(" at ");
        const datePart = parts[0];
        const timePart = parts[1].split(" UTC")[0];
        date = new Date(`${datePart} ${timePart}`);
      }
      // Handle ISO string or other standard date formats
      else if (typeof timestamp === "string") {
        date = new Date(timestamp);
      }
      // Handle Date object
      else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        console.log("Unknown timestamp format:", timestamp);
        return "Invalid Format";
      }

      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.error("Invalid date created from timestamp:", timestamp);
        return "Invalid Date";
      }

      // Return formatted time with date
      return date.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting timestamp:", error, timestamp);
      return "Error";
    }
  };

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/");
      else fetchMyAttendance();
    });
    checkIP();
    return () => unsub();
  }, [navigate]);

  return (
    <div className="teacher-container">
      <h2>👨‍🏫 Teacher Dashboard</h2>
      <p className="ip">
        Your IP: <b>{ip}</b>
      </p>

      {allowed ? (
        <button className="mark-btn" disabled={marked} onClick={markAttendance}>
          {marked ? "✅ Already Marked" : "📍 Mark Attendance"}
        </button>
      ) : (
        <p className="error-msg">⚠️ Not in the school network.</p>
      )}

      <p className="message">{msg}</p>

      <h3>🗓️ My Past Attendance</h3>
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Marked At</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(records) && records.length > 0 ? (
            records.map((rec, i) => (
              <tr key={i}>
                <td>{rec.date}</td>
                <td>{formatTimestamp(rec.timestamp)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="2">No records found</td>
            </tr>
          )}
        </tbody>
      </table>

      <hr />
      <button onClick={logout} className="logout-btn">
        🚪 Logout
      </button>
    </div>
  );
};

export default TeacherDashboard;
