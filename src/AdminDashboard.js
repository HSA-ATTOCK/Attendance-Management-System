// AdminDashboard.js (Fixed with proper timestamp formatting)
import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [viewAll, setViewAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // ✅ ADDED: Same timestamp formatting function from TeacherDashboard
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/");
      else fetchAllAttendance();
    });
    return () => unsub();
  }, [navigate]);

  const create = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/create-teacher`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password: pass }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setMsg("✅ Teacher created successfully");
        setName("");
        setEmail("");
        setPass("");
      } else {
        setMsg("❌ Failed: " + data.error);
      }
    } catch (error) {
      setMsg("❌ Error: " + error.message);
    }
  };

  const fetchAllAttendance = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/all-attendance`
      );
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      setMsg("❌ Failed to fetch records");
    }
  };

  const handleSearch = () => {
    console.log("Search executed for:", searchTerm);
  };

  const filtered = records.filter(
    (rec) =>
      rec.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (dateFilter ? rec.date === dateFilter : true)
  );

  const downloadCSV = () => {
    const csvRows = ["Name,Date,Time"];
    filtered.forEach((r) => {
      // ✅ FIXED: Use formatTimestamp function instead of direct Date conversion
      const time = formatTimestamp(r.timestamp);
      csvRows.push(`${r.name},${r.date},${time}`);
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance.csv";
    a.click();
  };

  const logout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="dashboard-container">
      <h2>👨‍💼 Admin Dashboard</h2>

      <div className="create-teacher-form">
        <div className="form-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Teacher Name"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Teacher Email"
          />
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Teacher Password"
          />
        </div>
        <button onClick={create}>Create Teacher</button>
        <p className={`message ${msg.includes("✅") ? "success" : "error"}`}>
          {msg}
        </p>
      </div>

      <div className="divider"></div>

      <div className="records-section">
        <div className="records-header">
          <h3>📋 All Attendance Records</h3>
          <div className="filter-controls">
            <div className="search-group">
              <input
                placeholder="Search teacher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button className="search-btn" onClick={handleSearch}>
                🔍 Search
              </button>
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <button onClick={downloadCSV}>⬇️ Download CSV</button>
          </div>
        </div>

        <table className="attendance-table">
          {/* ... table content ... */}
        </table>
      </div>

      <div className="divider"></div>

      <button className="logout-btn" onClick={logout}>
        🚪 Logout
      </button>
    </div>
  );
};

export default AdminDashboard;
