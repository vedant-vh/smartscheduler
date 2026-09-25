// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getToken } from '../utils/auth';
import { useSocket, getSocket } from '../utils/useSocket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
console.log('API_URL:', API_URL);

const MeetsPage = ({ user }) => {
  const [meetings, setMeetings] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [submitting, setSubmitting] = useState({});
  const [loadingSuggest, setLoadingSuggest] = useState({});
  const [scheduling, setScheduling] = useState({});
  const [showSuggestPopup, setShowSuggestPopup] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [suggested, setSuggested] = useState({});
  const [showResponsesPopup, setShowResponsesPopup] = useState(false);
  const [selectedMeetingResponses, setSelectedMeetingResponses] = useState(null);

  // States for the timing submission popup
  const [showTimingPopup, setShowTimingPopup] = useState(false);
  const [selectedMeetingForTiming, setSelectedMeetingForTiming] = useState(null);
  const [multipleTimings, setMultipleTimings] = useState([{ start: '', end: '' }]);

  const fetchMeetings = async () => {
    try {
      const res = await fetch(`${API_URL}/meetings`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch meetings');
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await fetch(`${API_URL}/meetings/notifications`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setPendingCount(data.count);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const socketRef = useSocket();

  useEffect(() => {
    fetchMeetings();
    fetchPendingCount();
  }, []);

  // --- Real-time socket listeners ---
  useEffect(() => {
    const socket = getSocket();

    const handleMeetingUpdated = ({ meetingId, updatedBy }) => {
      // Refresh the meetings list when any participant submits/edits timings
      fetchMeetings();
      fetchPendingCount();
      // Only show a toast if someone else updated (not the current user's own action)
      if (updatedBy !== String(user._id)) {
        toast.info('A participant updated their availability.');
      }
    };

    const handleMeetingFinalized = ({ meetingId, meetLink }) => {
      fetchMeetings();
      toast.success('A meeting has been finalized! Check your meetings for the Join link.', { autoClose: 6000 });
    };

    socket.on('meeting:updated', handleMeetingUpdated);
    socket.on('meeting:finalized', handleMeetingFinalized);

    return () => {
      socket.off('meeting:updated', handleMeetingUpdated);
      socket.off('meeting:finalized', handleMeetingFinalized);
    };
  }, [user._id]);
  
  const isHost = (meeting) => String(meeting.host._id) === String(user._id);
  const isInvitee = (meeting) => meeting.invitees.some(i => String(i._id) === String(user._id));
  const getInviteeResponse = (meeting) => meeting.inviteeResponses.find(r => {
    if (!r.user) return false;
    if (typeof r.user === 'object' && r.user._id) return String(r.user._id) === String(user._id);
    return String(r.user) === String(user._id);
  });

  const formatTimingForDisplay = (timing) => {
    const start = new Date(timing.start);
    const end = new Date(timing.end);
    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  };

  // --- Date & Time Formatting ---
  const formatDate = (dateString) => {
    if (!dateString || new Date(dateString).toString() === 'Invalid Date') return 'Date TBD';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString || new Date(dateString).toString() === 'Invalid Date') return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  // --- Status Logic ---
  const getMeetingStatus = (meeting) => {
    if (meeting.finalizedSlot && meeting.finalizedSlot.start) return 'Finalized';
    if (meeting.status === 'awaiting_selection') return 'Awaiting Selection';
    return 'Pending Input';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Finalized': return 'bg-green-100 text-green-800';
      case 'Awaiting Selection': return 'bg-blue-100 text-blue-800';
      case 'Pending Input': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // --- Timing Submission Popup Logic ---
  const openTimingPopup = (meeting) => {
    setSelectedMeetingForTiming(meeting);
    
    // Pre-fill with existing timings if any
    const existingResponse = getInviteeResponse(meeting);
    if (existingResponse && existingResponse.timings && existingResponse.timings.length > 0) {
      const existingTimings = existingResponse.timings.map(timing => {
        const start = new Date(timing.start);
        const end = new Date(timing.end);
        return {
          start: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
          end: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
        };
      });
      setMultipleTimings(existingTimings);
    } else {
      setMultipleTimings([{ start: '', end: '' }]);
    }
    setShowTimingPopup(true);
  };

  const addTimingSlot = () => setMultipleTimings([...multipleTimings, { start: '', end: '' }]);
  const removeTimingSlot = (index) => setMultipleTimings(multipleTimings.filter((_, i) => i !== index));

  const updateTimingSlot = (index, field, value) => {
    const updated = [...multipleTimings];
    updated[index][field] = value;
    setMultipleTimings(updated);
  };
  
  const submitMultipleTimings = async () => {
    const meetingId = selectedMeetingForTiming._id;
    setSubmitting(prev => ({ ...prev, [meetingId]: true }));

    const validTimings = multipleTimings.filter(t => t.start && t.end);
    if (validTimings.length === 0) {
      toast.error('Please add and fill at least one time slot.');
      setSubmitting(prev => ({ ...prev, [meetingId]: false }));
      return;
    }

    // Frontend validation: ensure each slot is at least the required duration
    const duration = selectedMeetingForTiming.duration;
    for (const timing of validTimings) {
      const [startHour, startMinute] = timing.start.split(':').map(Number);
      const [endHour, endMinute] = timing.end.split(':').map(Number);
      const startMins = startHour * 60 + startMinute;
      const endMins = endHour * 60 + endMinute;
      if (endMins - startMins < duration) {
        toast.error(`Each slot must be at least ${duration} minutes.`);
        setSubmitting(prev => ({ ...prev, [meetingId]: false }));
        return;
      }
    }

    try {
      // Convert HH:mm timings to ISO strings using meetingDate
      const meetingDate = selectedMeetingForTiming.meetingDate
        ? selectedMeetingForTiming.meetingDate.split('T')[0]  // ensure just YYYY-MM-DD
        : new Date().toISOString().split('T')[0];
      const timingsForBackend = validTimings.map(timing => ({
        start: new Date(`${meetingDate}T${timing.start}:00`).toISOString(),
        end: new Date(`${meetingDate}T${timing.end}:00`).toISOString()
      }));
      
      console.log('Sending timings to backend:', timingsForBackend);
      
      const response = await fetch(`${API_URL}/meetings/${meetingId}/submit-timings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ timings: timingsForBackend }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit timings');
      }
      
      toast.success('Your availability has been submitted!');
      setShowTimingPopup(false);
      fetchMeetings();
      fetchPendingCount();
    } catch (error) {
      toast.error(error.message || 'An error occurred while submitting.');
    } finally {
      setSubmitting(prev => ({ ...prev, [meetingId]: false }));
    }
  };

  // --- Suggest Times Popup Logic ---
  const handleSuggestTimes = async (meeting) => {
    setSelectedMeeting(meeting);
    setLoadingSuggest(prev => ({ ...prev, [meeting._id]: true }));
    try {
      const res = await fetch(`${API_URL}/meetings/${meeting._id}/suggest-times`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();

      if (!res.ok) {
        // Host hasn't submitted their own availability yet — show timing popup for them
        if (data.code === 'HOST_AVAILABILITY_MISSING') {
          toast.info('Please submit your own availability first before generating suggestions.');
          openTimingPopup(meeting);
          return;
        }
        toast.error(data.message || 'No suitable time slots found.');
        setSuggested(prev => ({ ...prev, [meeting._id]: [] }));
        setShowSuggestPopup(true);
        return;
      }

      setSuggested(prev => ({ ...prev, [meeting._id]: data }));
      setShowSuggestPopup(true);
    } catch (error) {
      toast.error('Failed to get suggestions.');
    } finally {
      setLoadingSuggest(prev => ({ ...prev, [meeting._id]: false }));
    }
  };
  
  // --- View Responses Logic ---
  const handleViewResponses = async (meeting) => {
    try {
      const res = await fetch(`${API_URL}/meetings/${meeting._id}/responses`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to fetch responses');
      const data = await res.json();
      setSelectedMeetingResponses(data);
      setShowResponsesPopup(true);
    } catch (error) {
      toast.error('Failed to fetch responses');
    }
  };

  // --- Schedule Meet Logic ---
  const handleScheduleMeet = async (meeting, slot) => {
    setScheduling(prev => ({ ...prev, [meeting._id]: true }));
    try {
        console.log('Scheduling meeting:', meeting._id);
        console.log('Slot data:', slot);
        
        const participants = [meeting.host, ...meeting.invitees].filter(p => slot.participants.some(sp => sp._id === p._id));
        console.log('Participants:', participants);
        
        const requestBody = { start: slot.start, end: slot.end, participants };
        console.log('Request body:', requestBody);
        
        const res = await fetch(`${API_URL}/meetings/${meeting._id}/schedule-gmeet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify(requestBody),
        });
        
        const data = await res.json();
        console.log('Response status:', res.status);
        console.log('Response data:', data);
        
        if (!res.ok) {
          if (data.message && data.message.includes('Google authorization required') && data.authUrl) {
            window.open(data.authUrl, '_blank', 'width=500,height=600');
            toast.info('Please authorize Google Calendar access in the new window, then try scheduling again.');
          } else if (data.message && data.message.includes('not configured')) {
            toast.error('Google Calendar integration not configured. Please follow the setup guide.');
          } else {
            throw new Error(data.message || data.error || 'Failed to schedule.');
          }
          return;
        }
        
        toast.success('Meeting scheduled successfully!');
        setShowSuggestPopup(false);
        fetchMeetings();
    } catch (err) {
        console.error('Scheduling error:', err);
        toast.error(err.message || 'Failed to schedule meeting.');
    } finally {
        setScheduling(prev => ({ ...prev, [meeting._id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {pendingCount > 0 && (
          <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium animate-pulse mb-4 w-fit">
            {pendingCount} pending response{pendingCount > 1 ? 's' : ''}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Meeting', 'Host', 'Participants', 'Duration', 'Status', 'Actions'].map(header => (
                    <th key={header} className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {meetings.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No meetings found.</td></tr>
                ) : (
                  meetings.map(meeting => (
                    <tr key={meeting._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-sm font-medium text-gray-900 truncate">{meeting.title}</div>
                        <div className="text-sm text-gray-500 mt-1 truncate">{meeting.description}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          📅 {meeting.finalizedSlot?.start
                            ? `${formatDate(meeting.finalizedSlot.start)} ${formatTime(meeting.finalizedSlot.start)}`
                            : meeting.meetingDate
                              ? new Date(meeting.meetingDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              : 'Date TBD'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{meeting.host.name}</div>
                        <div className="text-sm text-gray-500">{meeting.host.email}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-sm text-gray-900 truncate">{meeting.invitees.map(i => i.name).join(', ')}</div>
                        {isHost(meeting) && (
                            <div className="text-xs text-blue-600 mt-1 font-medium">
                                {meeting.submittedCount} of {meeting.invitees.length} submitted
                            </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{meeting.duration} min</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(getMeetingStatus(meeting))}`}>
                          {getMeetingStatus(meeting)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 items-start">
                          {isHost(meeting) && getMeetingStatus(meeting) !== 'Finalized' &&(
                            <>
                              <button
                                onClick={() => handleSuggestTimes(meeting)}
                                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition disabled:opacity-50"
                                disabled={loadingSuggest[meeting._id] || meeting.submittedCount < meeting.invitees.length}
                                title={meeting.submittedCount < meeting.invitees.length ? 'Waiting for all participants to respond' : 'Suggest meeting times'}
                              >
                                {loadingSuggest[meeting._id] ? 'Loading...' : 'Suggest Times'}
                              </button>
                              <button
                                onClick={() => handleViewResponses(meeting)}
                                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700 transition"
                                title="View all responses"
                              >
                                View Responses
                              </button>
                            </>
                          )}
                          {isInvitee(meeting) && getMeetingStatus(meeting) !== 'Finalized' && (
                            <button onClick={() => openTimingPopup(meeting)} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition">
                              {getInviteeResponse(meeting) ? 'Edit Timings' : 'Submit Timings'}
                            </button>
                          )}
                          {meeting.finalizedSlot?.start && meeting.meetLink &&(
                            <a href={meeting.meetLink} target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition text-center">
                              Join Meeting
                            </a>
                          )}
                          {isInvitee(meeting) && getInviteeResponse(meeting) && (
                            <div className="text-xs text-green-600 font-medium">
                              <div>✓ Response Submitted</div>
                              {getInviteeResponse(meeting).timings && getInviteeResponse(meeting).timings.length > 0 && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {getInviteeResponse(meeting).timings.length} time slot{getInviteeResponse(meeting).timings.length > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Submit Timings Popup */}
      {showTimingPopup && selectedMeetingForTiming && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Submit Your Availability</h3>
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
              <div className="text-sm text-gray-700">
                Allowed window: <span className="font-semibold">{selectedMeetingForTiming.windowStart} - {selectedMeetingForTiming.windowEnd}</span>
              </div>
              <div className="text-sm text-gray-700">
                Required duration: <span className="font-semibold">{selectedMeetingForTiming.duration} minutes</span>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              {multipleTimings.map((timing, index) => {
                const [startHour, startMinute] = selectedMeetingForTiming.windowStart.split(':').map(Number);
                const [endHour, endMinute] = selectedMeetingForTiming.windowEnd.split(':').map(Number);
                const windowStartMinutes = startHour * 60 + startMinute;
                const windowEndMinutes = endHour * 60 + endMinute;
                const options = [];
                for (let m = windowStartMinutes; m <= windowEndMinutes; m++) {
                  const h = String(Math.floor(m / 60)).padStart(2, '0');
                  const min = String(m % 60).padStart(2, '0');
                  options.push(`${h}:${min}`);
                }
                let error = '';
                const start = timing.start;
                const end = timing.end;
                const duration = selectedMeetingForTiming.duration;
                if (start && end) {
                  const startMins = start.split(':').reduce((a, b, i) => a + Number(b) * (i === 0 ? 60 : 1), 0);
                  const endMins = end.split(':').reduce((a, b, i) => a + Number(b) * (i === 0 ? 60 : 1), 0);
                  if (endMins <= startMins) error = 'End time must be after start time.';
                  else if (endMins - startMins < duration) error = `Slot must be at least ${duration} minutes.`;
                }
                return (
                  <div key={index} className="flex flex-col gap-2 p-3 border rounded-lg bg-gray-50">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <select className="w-full px-3 py-2 border rounded-md" value={timing.start || ''} onChange={e => updateTimingSlot(index, 'start', e.target.value)}>
                          <option value="">Select start time</option>
                          {options.slice(0, -1).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <select className="w-full px-3 py-2 border rounded-md" value={timing.end || ''} onChange={e => updateTimingSlot(index, 'end', e.target.value)}>
                          <option value="">Select end time</option>
                          {options.slice(1).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <button onClick={() => removeTimingSlot(index)} className="px-3 py-2 text-red-600 hover:text-red-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    {error && <div className="text-red-600 text-xs mt-1">{error}</div>}
                  </div>
                );
              })}
              <button onClick={addTimingSlot} className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400">
                + Add Another Time Slot
              </button>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <button onClick={() => setShowTimingPopup(false)} className="px-4 py-2 border rounded-md">Cancel</button>
              <button onClick={submitMultipleTimings} disabled={submitting[selectedMeetingForTiming?._id]} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                {submitting[selectedMeetingForTiming?._id] ? 'Submitting...' : 'Submit Timings'}
              </button>
              <button onClick={() => setShowTimingPopup(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 mt-2">
                Not Available for this Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest Times Popup */}
      {showSuggestPopup && selectedMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Suggested Times for "{selectedMeeting.title}"</h3>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Start Time</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Participants</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(suggested[selectedMeeting._id] || []).length > 0 ? (
                                suggested[selectedMeeting._id].map((slot, idx) => (
                                    <tr key={idx} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {formatDate(slot.start)} at {formatTime(slot.start)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {slot.participants.length} ({slot.participants.map(p => p.name).join(', ')})
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleScheduleMeet(selectedMeeting, slot)}
                                                disabled={scheduling[selectedMeeting._id]}
                                                className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition"
                                            >
                                                {scheduling[selectedMeeting._id] ? 'Scheduling...' : 'Schedule'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="3" className="py-8 text-center text-gray-500">No suitable time slots found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end mt-4">
                    <button onClick={() => setShowSuggestPopup(false)} className="px-4 py-2 border rounded-md">Close</button>
                </div>
            </div>
        </div>
      )}

      {/* View Responses Popup */}
      {showResponsesPopup && selectedMeetingResponses && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Responses for "{selectedMeetingResponses.title}"</h3>
            <div className="space-y-4">
              {selectedMeetingResponses.invitees.map(invitee => {
                const response = selectedMeetingResponses.inviteeResponses.find(r => 
                  r.user && (r.user._id === invitee._id || r.user === invitee._id)
                );
                return (
                  <div key={invitee._id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{invitee.name}</h4>
                        <p className="text-sm text-gray-600">{invitee.email}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        response && response.timings && response.timings.length > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {response && response.timings && response.timings.length > 0 ? 'Responded' : 'No Response'}
                      </span>
                    </div>
                    {response && response.timings && response.timings.length > 0 ? (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">Submitted time slots:</p>
                        <div className="space-y-1">
                          {response.timings.map((timing, index) => (
                            <div key={index} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                              {formatTimingForDisplay(timing)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No time slots submitted yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowResponsesPopup(false)} className="px-4 py-2 border rounded-md">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetsPage;
