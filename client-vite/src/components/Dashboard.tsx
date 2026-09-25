// @ts-nocheck
import React, { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import { getToken } from '../utils/auth';

const API = import.meta.env.VITE_API_URL;

const Dashboard = ({ user }) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [tab, setTab] = useState("friends");
  const [connections, setConnections] = useState({ friends: [], sentRequests: [], receivedRequests: [] });
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [duration, setDuration] = useState(30);
  const [title, setTitle] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [meetings, setMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [attendeeModal, setAttendeeModal] = useState({ open: false, attendees: [], title: "", invitees: [] });
  const [openSection, setOpenSection] = useState("upcoming"); // Only one open at a time
  const [meetingDate, setMeetingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [windowStart, setWindowStart] = useState('09:00');
  const [windowEnd, setWindowEnd] = useState('18:00');
  const [deadlineDays, setDeadlineDays] = useState(3);
  const [formError, setFormError] = useState('');

  // Fetch connections (friends, requests)
  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/connections`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setConnections(data);
    } catch (err) {
      // handle error
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchConnections();
    // eslint-disable-next-line
  }, [user]);

  // Search users by partial email
  useEffect(() => {
    if (!search) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }
    setSearching(true);
    setSearchError("");
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/search-users?email=${encodeURIComponent(search)}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data);
      } catch (err) {
        setResults([]);
        setSearchError("Error searching users");
      }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  // Send friend request
  const sendRequest = async (toUserId) => {
    await fetch(`${API}/send-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ toUserId }),
    });
    setSearch("");
    setResults([]);
    fetchConnections();
  };

  // Accept friend request
  const acceptRequest = async (fromUserId) => {
    await fetch(`${API}/accept-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ fromUserId }),
    });
    fetchConnections();
  };

  const handleFriendToggle = (id) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e, meetingDetails) => {
    e.preventDefault();
    setFormError('');
    if (!title) { setFormError('Please enter a meeting title.'); return; }
    if (!meetingDate || !windowStart || !windowEnd) { setFormError('Please fill all fields.'); return; }
    const startDateTime = new Date(`${meetingDate}T${windowStart}`);
    const endDateTime = new Date(`${meetingDate}T${windowEnd}`);
    if (endDateTime <= startDateTime) { setFormError('End time must be after start time.'); return; }
    try {
      const res = await fetch(`${API}/schedule-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...meetingDetails, friendIds: selectedFriends, duration, deadlineDays }),
      });
      if (!res.ok) throw new Error("Meeting scheduling failed");
      setSuccessMsg("Meeting scheduled and friends notified!");
      setTimeout(() => {
        setSuccessMsg(""); setShowModal(false);
        setSelectedFriends([]); setDuration(30); setTitle(""); setDeadlineDays(3);
      }, 1500);
    } catch (err) {
      setFormError("Error scheduling meeting");
    }
  };

  useEffect(() => {
    if (!user) return;
    setMeetingsLoading(true);
    fetch(`${API}/meetings`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => setMeetings(Array.isArray(data) ? data : []))
      .finally(() => setMeetingsLoading(false));
  }, [user, showModal, successMsg]);

  function formatDate(dt) {
    return new Date(dt).toLocaleDateString();
  }
  function formatTime(dt) {
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const now = Date.now();
  const past = meetings.filter(m => m.finalizedSlot && new Date(m.finalizedSlot.end) < now);
  const ongoing = meetings.filter(m => m.finalizedSlot && new Date(m.finalizedSlot.start) <= now && new Date(m.finalizedSlot.end) >= now);
  const upcoming = meetings.filter(m => m.finalizedSlot && new Date(m.finalizedSlot.start) > now);

  function MeetingTable({ data, color }) {
    const colorMap = {
      red: "from-red-100 to-red-50 border-red-300",
      green: "from-green-100 to-green-50 border-green-300",
      blue: "from-blue-100 to-blue-50 border-blue-300",
    };
    const colorText = {
      red: "text-red-700",
      green: "text-green-700",
      blue: "text-blue-700",
    };
    return (
      <div className="w-full">
        <div className="overflow-x-auto">
          <div className="h-[50vh] overflow-y-auto rounded-lg">
            <table className="min-w-full text-base">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="px-3 py-2 font-semibold text-gray-700">Date</th>
                  <th className="px-3 py-2 font-semibold text-gray-700">Start</th>
                  <th className="px-3 py-2 font-semibold text-gray-700">End</th>
                  <th className="px-3 py-2 font-semibold text-gray-700">Host</th>
                  <th className="px-3 py-2 font-semibold text-gray-700">Title</th>
                  <th className="px-3 py-2 font-semibold text-gray-700">Attendees</th>
                  <th className="px-3 py-2 font-semibold text-gray-700">Meet Link</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-6 text-gray-400">No meetings</td></tr>
                ) : data.map(m => {
                  let attendees = Array.isArray(m.finalizedSlot.confirmedParticipants) && m.finalizedSlot.confirmedParticipants.length > 0
                    ? m.finalizedSlot.confirmedParticipants
                    : m.invitees;
                  return (
                    <tr key={m._id} className="border-b border-gray-200 hover:bg-white/70 transition">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(m.finalizedSlot.start)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatTime(m.finalizedSlot.start)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatTime(m.finalizedSlot.end)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{m.host?.name || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{m.title}</td>
                      <td className="px-3 py-2 whitespace-nowrap max-w-[180px]">
                        <button
                          className="underline text-blue-700 hover:text-blue-900 font-medium cursor-pointer"
                          onClick={() => setAttendeeModal({ open: true, attendees, title: m.title, invitees: m.invitees })}
                          type="button"
                        >
                          View Attendees
                        </button>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {m.meetLink ? (
                          <div className="flex flex-col gap-1 items-start">
                            <a
                              href={m.meetLink}
                              className={`underline font-semibold ${color === "red" ? "pointer-events-none opacity-50" : "text-blue-600 hover:text-blue-800"}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              tabIndex={color === "red" ? -1 : 0}
                            >
                              Join
                            </a>
                            <span className="text-xs text-gray-500">{formatTime(m.finalizedSlot.start)} - {formatTime(m.finalizedSlot.end)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function CollapsibleMeetingSection({ id, title, color, data, openSection, setOpenSection, children }) {
    const colorMap = {
      red: "from-red-100 to-red-50 border-red-300",
      green: "from-green-100 to-green-50 border-green-300",
      blue: "from-blue-100 to-blue-50 border-blue-300",
    };
    const colorText = {
      red: "text-red-700",
      green: "text-green-700",
      blue: "text-blue-700",
    };
    const isOpen = openSection === id;
    return (
      <div className={`w-full mb-6 bg-gradient-to-br ${colorMap[color]} border rounded-2xl shadow-lg overflow-hidden`}>
        <button
          className={`w-full flex items-center justify-between px-8 py-5 text-2xl font-bold ${colorText[color]} focus:outline-none select-none`}
          onClick={() => setOpenSection(isOpen ? null : id)}
          type="button"
        >
          <span>{title}</span>
          <span className="text-xl">{isOpen ? "▲" : "▼"}</span>
        </button>
        {isOpen && (
          <div className="px-4 pb-6">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white rounded shadow flex flex-col gap-6 px-2 sm:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="text-left">
          <h2 className="text-4xl font-extrabold text-green-700 mb-2">Meetings Dashboard</h2>
          <p className="text-lg text-gray-700 max-w-2xl">
            Effortlessly schedule, view, and manage your meetings with friends. Stay organized, collaborate seamlessly, and never miss a call—your smart scheduling assistant is here!
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-7 py-3 bg-blue-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
          onClick={() => setShowModal(true)}
          type="button"
          style={{ boxShadow: '0 8px 24px 0 rgba(37, 99, 235, 0.15)' }}
        >
          <FaPlus className="text-2xl" />
          <span>Schedule Meeting</span>
        </button>
      </div>
      {/* Modal for scheduling meeting */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 sm:mx-auto p-8 relative animate-fade-in flex flex-col"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-2xl font-bold focus:outline-none"
              onClick={() => setShowModal(false)}
              aria-label="Close"
              type="button"
            >
              &times;
            </button>
            <form onSubmit={e => {
              e.preventDefault();
              setFormError('');
              if (!title) {
                setFormError('Please enter a meeting title.');
                return;
              }
              if (!meetingDate || !windowStart || !windowEnd) {
                setFormError('Please fill all fields.');
                return;
              }
              const startDateTime = new Date(`${meetingDate}T${windowStart}`);
              const endDateTime = new Date(`${meetingDate}T${windowEnd}`);
              if (endDateTime <= startDateTime) {
                setFormError('End time must be after start time.');
                return;
              }
              handleSubmit(e, { title, meetingDate, windowStart, windowEnd, duration, deadlineDays });
            }} className="space-y-6 mt-4">
              <h2 className="text-2xl font-bold mb-2 text-blue-700">Schedule a Meeting</h2>
              <div>
                <label className="block mb-1 font-medium text-base">Meeting Title</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-green-200 text-lg"
                  placeholder="Enter meeting title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-base">Date</label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={meetingDate}
                  onChange={e => setMeetingDate(e.target.value)}
                  className="w-48 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 text-base"
                  required
                />
              </div>
              <div className="flex gap-4">
                <div>
                  <label className="block mb-1 font-medium text-base">Start Time</label>
                  <input
                    type="time"
                    value={windowStart}
                    onChange={e => setWindowStart(e.target.value)}
                    className="w-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium text-base">End Time</label>
                  <input
                    type="time"
                    value={windowEnd}
                    onChange={e => setWindowEnd(e.target.value)}
                    className="w-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 text-base"
                    required
                  />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold mb-2 text-blue-700">Select Friends</h2>
                <div className="mb-2 max-h-40 overflow-y-auto flex flex-col gap-2">
                  {connections.friends.length === 0 ? (
                    <div className="text-gray-500">No friends to invite.</div>
                  ) : (
                    connections.friends.map(f => (
                      <label key={f._id} className="flex items-center cursor-pointer gap-2">
                        <input
                          type="checkbox"
                          className="accent-green-500 w-5 h-5"
                          checked={selectedFriends.includes(f._id)}
                          onChange={() => handleFriendToggle(f._id)}
                        />
                        <span className="font-medium text-gray-800 text-base">{f.name}</span>
                        <span className="ml-2 text-sm text-gray-500">{f.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium text-base">Duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-32 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 text-base"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-base">Response Deadline</label>
                <select
                  value={deadlineDays}
                  onChange={e => setDeadlineDays(Number(e.target.value))}
                  className="w-40 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 text-base"
                >
                  <option value={1}>1 day</option>
                  <option value={2}>2 days</option>
                  <option value={3}>3 days (default)</option>
                  <option value={5}>5 days</option>
                  <option value={7}>1 week</option>
                  <option value={14}>2 weeks</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">Invitees must submit their availability before this deadline.</p>
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition text-lg"
                disabled={selectedFriends.length === 0 || !title}
              >
                Send Meeting Invite
              </button>
              {successMsg && <div className="mt-2 text-green-600 font-semibold text-center">{successMsg}</div>}
              {formError && <div className="text-red-600 text-sm font-medium">{formError}</div>}
            </form>
          </div>
        </div>
      )}
      {meetingsLoading ? (
        <div className="text-center text-gray-500 my-8">Loading meetings...</div>
      ) : (
        <div className="w-full max-w-6xl mx-auto mt-8 flex flex-col gap-4">
          <CollapsibleMeetingSection
            id="past"
            title="Past Meetings"
            color="red"
            data={past}
            openSection={openSection}
            setOpenSection={setOpenSection}
          >
            <MeetingTable title="Past Meetings" data={past} color="red" />
          </CollapsibleMeetingSection>
          <CollapsibleMeetingSection
            id="ongoing"
            title="Ongoing Meets"
            color="green"
            data={ongoing}
            openSection={openSection}
            setOpenSection={setOpenSection}
          >
            <MeetingTable title="Ongoing Meets" data={ongoing} color="green" />
          </CollapsibleMeetingSection>
          <CollapsibleMeetingSection
            id="upcoming"
            title="Upcoming Meets"
            color="blue"
            data={upcoming}
            openSection={openSection}
            setOpenSection={setOpenSection}
          >
            <MeetingTable title="Upcoming Meets" data={upcoming} color="blue" />
          </CollapsibleMeetingSection>
        </div>
      )}
      {/* Attendee Modal Popup */}
      {attendeeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 sm:mx-auto p-6 relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-2xl font-bold focus:outline-none"
              onClick={() => setAttendeeModal({ open: false, attendees: [], title: "", invitees: [] })}
              aria-label="Close"
              type="button"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-blue-700">Attendees for: {attendeeModal.title}</h2>
            <ul className="divide-y divide-gray-200">
              {attendeeModal.attendees.map((a, idx) => {
                let name = a.name, email = a.email;
                if (!name && typeof a === 'string' && Array.isArray(attendeeModal.invitees)) {
                  // Try to find in invitees by _id
                  const found = attendeeModal.invitees.find(inv => inv._id === a || inv._id === a._id);
                  if (found) {
                    name = found.name;
                    email = found.email;
                  }
                }
                return (
                  <li key={a._id || a.email || a || idx} className="py-2">
                    <div className="font-semibold text-gray-800">{name || a._id || a}</div>
                    <div className="text-sm text-gray-500">{email || ""}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
