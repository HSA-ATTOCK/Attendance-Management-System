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
  const [collegeTime, setCollegeTime] = useState(null);
  const [todayStatus, setTodayStatus] = useState(null);
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

  // ✅ Check college time status
  const checkCollegeTime = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/college-time`
      );
      const data = await res.json();
      setCollegeTime(data);
    } catch (err) {
      console.error("Failed to fetch college time:", err);
    }
  };

  // ✅ Check today's attendance status
  const checkTodayStatus = async () => {
    try {
      const uid = auth.currentUser.uid;
      const today = new Date().toISOString().split("T")[0];

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/teacher-attendance/${uid}`
      );
      const data = await res.json();

      if (Array.isArray(data)) {
        const todayRecord = data.find((record) => record.date === today);
        setTodayStatus(todayRecord);
        setMarked(!!todayRecord);
      }
    } catch (err) {
      console.error("Failed to check today's status:", err);
    }
  };

  // ✅ Mark today's attendance
  const markAttendance = async () => {
    try {
      const uid = auth.currentUser.uid;
      const today = new Date().toISOString().split("T")[0];

      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/mark-attendance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid, date: today }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setMarked(true);
        setMsg("✅ Attendance marked successfully!");
        fetchMyAttendance();
        checkTodayStatus();
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
        `${process.env.REACT_APP_BACKEND_URL}/teacher-attendance/${uid}`
      );
      const data = await res.json();

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
        const seconds = timestamp._seconds || timestamp.seconds;
        const nanoseconds =
          timestamp._nanoseconds || timestamp.nanoseconds || 0;
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

  // ✅ Get attendance status display
  const getAttendanceStatusDisplay = (record) => {
    if (record.present) {
      return {
        text: "✅ Present",
        color: "#10b981",
        markedBy: record.markedBy === "teacher" ? "Self-marked" : "System",
      };
    } else {
      return {
        text: "❌ Absent",
        color: "#ef4444",
        markedBy: record.markedBy === "system" ? "Auto-marked" : "System",
      };
    }
  };

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/");
      else {
        fetchMyAttendance();
        checkTodayStatus();
        checkCollegeTime();
      }
    });
    checkIP();
    return () => unsub();
  }, [navigate]);

  // ✅ Auto-refresh every 30 seconds to check for system updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (auth.currentUser) {
        checkTodayStatus();
        checkCollegeTime();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="teacher-container">
      <h2>👨‍🏫 Teacher Dashboard</h2>

      {/* ✅ College Time Status */}
      {collegeTime && (
        <div
          className="college-time-status"
          style={{
            padding: "1rem",
            margin: "1rem 0",
            borderRadius: "8px",
            backgroundColor: collegeTime.isOpen ? "#d1fae5" : "#fee2e2",
            border: `1px solid ${collegeTime.isOpen ? "#10b981" : "#ef4444"}`,
          }}
        >
          <h4>🕒 College Time Status</h4>
          <p>
            <strong>Status:</strong>{" "}
            {collegeTime.isOpen ? "🟢 Open" : "🔴 Closed"}
          </p>
          <p>
            <strong>College Hours:</strong> {collegeTime.config.START_HOUR}:00 -{" "}
            {collegeTime.config.END_HOUR}:00
          </p>
          <p>
            <strong>Current Time:</strong> {collegeTime.currentTime}
          </p>
          {!collegeTime.isWeekday && (
            <p style={{ color: "#ef4444" }}>
              <strong>⚠️ Weekend:</strong> Attendance marking not available
            </p>
          )}
        </div>
      )}

      {/* ✅ Today's Status */}
      {todayStatus && (
        <div
          className="today-status"
          style={{
            padding: "1rem",
            margin: "1rem 0",
            borderRadius: "8px",
            backgroundColor: todayStatus.present ? "#d1fae5" : "#fee2e2",
            border: `1px solid ${todayStatus.present ? "#10b981" : "#ef4444"}`,
          }}
        >
          <h4>📅 Today's Status</h4>
          <p
            style={{
              color: todayStatus.present ? "#10b981" : "#ef4444",
              fontWeight: "bold",
              fontSize: "1.1rem",
            }}
          >
            {todayStatus.present ? "✅ Present" : "❌ Absent"}
          </p>
          <p>
            <strong>Date:</strong> {todayStatus.date}
          </p>
          <p>
            <strong>Time:</strong> {formatTimestamp(todayStatus.timestamp)}
          </p>
          <p>
            <strong>Marked By:</strong>{" "}
            {todayStatus.markedBy === "teacher"
              ? "You"
              : "System (Auto-absent)"}
          </p>
          {todayStatus.reason && (
            <p style={{ color: "#ef4444", fontSize: "0.9rem" }}>
              <strong>Reason:</strong> {todayStatus.reason}
            </p>
          )}
        </div>
      )}

      <p className="ip">
        Your IP: <b>{ip}</b>
      </p>

      {allowed && collegeTime?.isOpen ? (
        <button className="mark-btn" disabled={marked} onClick={markAttendance}>
          {marked ? "✅ Already Marked" : "📍 Mark Attendance"}
        </button>
      ) : (
        <div>
          {!allowed && (
            <p className="error-msg">⚠️ Not in the school network.</p>
          )}
          {allowed && collegeTime && !collegeTime.isOpen && (
            <p className="error-msg">
              ⚠️ Attendance marking is closed.
              {collegeTime.isWeekday ? " Outside college hours." : " Weekend."}
            </p>
          )}
        </div>
      )}

      <p className="message">{msg}</p>

      <h3>🗓️ My Attendance History</h3>
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Marked At</th>
            <th>Marked By</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(records) && records.length > 0 ? (
            records.map((rec, i) => {
              const statusDisplay = getAttendanceStatusDisplay(rec);
              return (
                <tr key={i}>
                  <td>{rec.date}</td>
                  <td>
                    <span
                      style={{
                        color: statusDisplay.color,
                        fontWeight: "600",
                      }}
                    >
                      {statusDisplay.text}
                    </span>
                  </td>
                  <td>{formatTimestamp(rec.timestamp)}</td>
                  <td>
                    <span
                      style={{
                        fontSize: "0.9rem",
                        color:
                          rec.markedBy === "teacher" ? "#10b981" : "#6b7280",
                      }}
                    >
                      {rec.markedBy === "teacher" ? "Self" : "System"}
                    </span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="4">No records found</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ✅ Attendance Summary */}
      {records.length > 0 && (
        <div
          className="attendance-summary"
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h4>📊 Attendance Summary</h4>
          <div
            style={{ display: "flex", gap: "2rem", justifyContent: "center" }}
          >
            <div>
              <strong>Total Days:</strong> {records.length}
            </div>
            <div style={{ color: "#10b981" }}>
              <strong>Present:</strong>{" "}
              {records.filter((r) => r.present).length}
            </div>
            <div style={{ color: "#ef4444" }}>
              <strong>Absent:</strong>{" "}
              {records.filter((r) => !r.present).length}
            </div>
            <div style={{ color: "#3b82f6" }}>
              <strong>Percentage:</strong>{" "}
              {(
                (records.filter((r) => r.present).length / records.length) *
                100
              ).toFixed(1)}
              %
            </div>
          </div>
        </div>
      )}

      <hr />
      <button onClick={logout} className="logout-btn">
        🚪 Logout
      </button>
    </div>
  );
};

export default TeacherDashboard;
