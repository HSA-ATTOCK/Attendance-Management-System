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
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState([]);
  const [collegeTime, setCollegeTime] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoAbsentLoading, setAutoAbsentLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState("all");
  const navigate = useNavigate();

  // ✅ Same timestamp formatting function
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
        year: "numeric",
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

  // ✅ Check college time status
  const checkCollegeTime = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/college-time`
      );
      if (res.ok) {
        const data = await res.json();
        setCollegeTime(data);
      }
    } catch (err) {
      console.error("Failed to fetch college time:", err);
    }
  };

  // ✅ Initial setup on component mount
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/");
      } else {
        fetchAllAttendance();
        fetchAttendanceStats();
        checkCollegeTime();
      }
    });
    return () => unsub();
  }, [navigate]);

  // ✅ Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (auth.currentUser) {
        fetchAllAttendance();
        fetchAttendanceStats();
        checkCollegeTime();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // ✅ Create teacher function
  const create = async () => {
    if (!name.trim() || !email.trim() || !pass.trim()) {
      setMsg("❌ Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/create-teacher`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password: pass,
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setMsg("✅ Teacher created successfully");
        setName("");
        setEmail("");
        setPass("");
        setTimeout(() => setMsg(""), 3000);
      } else {
        setMsg("❌ Failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      setMsg("❌ Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch all attendance records
  const fetchAllAttendance = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/all-attendance`
      );
      if (res.ok) {
        const data = await res.json();
        setRecords(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to fetch attendance records");
      }
    } catch (err) {
      console.error("Failed to fetch records:", err);
      setRecords([]);
    }
  };

  // ✅ Fetch attendance statistics
  const fetchAttendanceStats = async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/attendance-stats`
      );
      if (res.ok) {
        const data = await res.json();
        setStats(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setStats([]);
    }
  };

  // ✅ Manual trigger for auto-absent marking
  const triggerAutoAbsent = async () => {
    setAutoAbsentLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/admin/mark-absent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await res.json();
      if (data.success) {
        setMsg("✅ Auto-absent marking completed");
        fetchAllAttendance();
        fetchAttendanceStats();
        setTimeout(() => setMsg(""), 3000);
      } else {
        setMsg("❌ Failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      setMsg("❌ Error: " + error.message);
    } finally {
      setAutoAbsentLoading(false);
    }
  };

  // ✅ Enhanced filtering logic
  const filtered = records.filter((rec) => {
    const nameMatch =
      rec.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const dateMatch = dateFilter ? rec.date === dateFilter : true;
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "present" && rec.present) ||
      (statusFilter === "absent" && !rec.present);

    return nameMatch && dateMatch && statusMatch;
  });

  // ✅ Download CSV function
  const downloadCSV = () => {
    if (filtered.length === 0) {
      setMsg("❌ No records to download");
      setTimeout(() => setMsg(""), 3000);
      return;
    }

    const csvRows = ["Name,Date,Status,Time,Marked By,Reason"];
    filtered.forEach((r) => {
      const time = formatTimestamp(r.timestamp);
      const status = r.present ? "Present" : "Absent";
      const markedBy = r.markedBy || "system";
      const reason = r.reason || "";
      csvRows.push(
        `"${r.name}","${r.date}","${status}","${time}","${markedBy}","${reason}"`
      );
    });

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ✅ Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // ✅ Clear filters function
  const clearFilters = () => {
    setSearchTerm("");
    setDateFilter("");
    setStatusFilter("all");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>👨‍💼 Admin Dashboard</h2>
        <button
          className="refresh-btn"
          onClick={() => {
            fetchAllAttendance();
            fetchAttendanceStats();
            checkCollegeTime();
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* ✅ College Time Status */}
      {collegeTime && (
        <div
          className={`college-time-status ${
            collegeTime.isOpen ? "open" : "closed"
          }`}
        >
          <h4>🕒 College Time Status</h4>
          <div className="time-info">
            <div className="status-item">
              <strong>Status:</strong>
              <span
                className={`status-badge ${
                  collegeTime.isOpen ? "open" : "closed"
                }`}
              >
                {collegeTime.isOpen ? "🟢 Open" : "🔴 Closed"}
              </span>
            </div>
            <div className="status-item">
              <strong>Hours:</strong> {collegeTime.config?.START_HOUR || "N/A"}
              :00 - {collegeTime.config?.END_HOUR || "N/A"}:00
            </div>
            <div className="status-item">
              <strong>Current:</strong> {collegeTime.currentTime || "N/A"}
            </div>
            {!collegeTime.isWeekday && (
              <div className="status-item weekend">
                <strong>Weekend</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✅ Create Teacher Form */}
      <div className="create-teacher-form">
        <h3>➕ Create New Teacher</h3>
        <div className="form-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Teacher Name"
            disabled={loading}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Teacher Email"
            disabled={loading}
          />
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Teacher Password"
            disabled={loading}
          />
        </div>
        <button onClick={create} disabled={loading} className="create-btn">
          {loading ? "Creating..." : "Create Teacher"}
        </button>
        {msg && (
          <p className={`message ${msg.includes("✅") ? "success" : "error"}`}>
            {msg}
          </p>
        )}
      </div>

      <div className="divider"></div>

      {/* ✅ Attendance Statistics */}
      {stats.length > 0 && (
        // Updated Attendance Statistics Section in AdminDashboard.js
        <div className="stats-section">
          <div className="stats-header">
            <h3>📊 Attendance Statistics</h3>
            <div className="stats-dropdown">
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="stats-select"
              >
                <option value="all">All Teachers</option>
                {stats.map((stat, index) => (
                  <option key={index} value={stat.teacher}>
                    {stat.teacher}
                  </option>
                ))}
              </select>
              <span className="dropdown-arrow">▼</span>
            </div>
          </div>

          <div className="stats-grid">
            {(selectedTeacher === "all"
              ? stats
              : stats.filter((stat) => stat.teacher === selectedTeacher)
            ).map((stat, index) => (
              <div key={index} className="stat-card">
                <div className="stat-header">
                  <h4>{stat.teacher}</h4>
                  <div className="stat-status">
                    <span
                      className={`status-badge ${
                        stat.attendancePercentage >= 75 ? "good" : "warning"
                      }`}
                    >
                      {stat.attendancePercentage >= 75
                        ? "👍 Good"
                        : "⚠️ Needs Improvement"}
                    </span>
                  </div>
                </div>
                <div className="stat-metrics">
                  <div className="metric">
                    <span className="metric-label">Total Days:</span>
                    <span className="metric-value">{stat.totalDays}</span>
                  </div>
                  <div className="metric present">
                    <span className="metric-label">Present:</span>
                    <span className="metric-value">{stat.presentCount}</span>
                  </div>
                  <div className="metric absent">
                    <span className="metric-label">Absent:</span>
                    <span className="metric-value">{stat.absentCount}</span>
                  </div>
                  <div className="metric rate">
                    <span className="metric-label">Attendance Rate:</span>
                    <span className="metric-value">
                      {stat.attendancePercentage}%
                    </span>
                  </div>
                </div>
                <div className="stat-chart">
                  <div
                    className="attendance-bar"
                    style={{ width: `${stat.attendancePercentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ✅ Records Section */}
      <div className="records-section">
        <div className="records-header">
          <h3>📋 All Attendance Records ({filtered.length})</h3>
          <div className="header-actions">
            <button onClick={downloadCSV} className="download-btn">
              ⬇️ Download CSV
            </button>
            <button
              onClick={triggerAutoAbsent}
              disabled={autoAbsentLoading}
              className="auto-absent-btn"
            >
              {autoAbsentLoading ? "Processing..." : "🤖 Trigger Auto-Absent"}
            </button>
          </div>
        </div>

        {/* ✅ Filter Controls */}
        <div className="filter-controls">
          <div className="search-group">
            <input
              type="text"
              placeholder="Search teacher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-select"
          >
            <option value="all">All Status</option>
            <option value="present">Present Only</option>
            <option value="absent">Absent Only</option>
          </select>
          <button onClick={clearFilters} className="clear-btn">
            🗑️ Clear Filters
          </button>
        </div>

        {/* ✅ Attendance Table */}
        <div className="table-container">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Teacher Name</th>
                <th>Date</th>
                <th>Status</th>
                <th>Time</th>
                <th>Marked By</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-records">
                    {searchTerm || dateFilter || statusFilter !== "all"
                      ? "No records found matching your filters"
                      : "No attendance records found"}
                  </td>
                </tr>
              ) : (
                filtered.map((record, index) => (
                  <tr key={`${record.name}-${record.date}-${index}`}>
                    <td className="teacher-name">{record.name}</td>
                    <td className="date">{record.date}</td>
                    <td className="status">
                      <span
                        className={`status-badge ${
                          record.present ? "present" : "absent"
                        }`}
                      >
                        {record.present ? "✅ Present" : "❌ Absent"}
                      </span>
                    </td>
                    <td className="time">
                      {formatTimestamp(record.timestamp)}
                    </td>
                    <td className="marked-by">
                      <span
                        className={`marked-by-badge ${
                          record.markedBy === "teacher" ? "teacher" : "system"
                        }`}
                      >
                        {record.markedBy === "teacher" ? "Teacher" : "System"}
                      </span>
                    </td>
                    <td className="reason">
                      <span className="reason-text" title={record.reason}>
                        {record.reason || "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Table Footer */}
        {filtered.length > 0 && (
          <div className="table-footer">
            <div className="record-count">
              Showing {filtered.length} of {records.length} records
              {searchTerm && ` for "${searchTerm}"`}
              {dateFilter && ` on ${dateFilter}`}
              {statusFilter !== "all" && ` (${statusFilter})`}
            </div>
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* ✅ Logout Button */}
      <div className="logout-section">
        <button className="logout-btn" onClick={logout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
