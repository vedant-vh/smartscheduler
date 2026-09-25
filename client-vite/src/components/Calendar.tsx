// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getToken } from '../utils/auth';

// Helper functions moved outside components
const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];
    
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }

  // Add all days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  return days;
};

const getTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    slots.push(hour);
  }
  return slots;
};

const API_URL = import.meta.env.VITE_API_URL;

const Calendar = ({ user }) => {
  //month la blue karu when clicked->initially keep it month
  const [view, setView] = useState('month'); // 'month' or '`day'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [oauthStatus, setOauthStatus] = useState(null);

  // Color scheme for meeting status
  const statusColors = {
    upcoming: 'bg-blue-500',
    ongoing: 'bg-green-500',
    past: 'bg-gray-400'
  };

  const statusTextColors = {
    upcoming: 'text-blue-700',
    ongoing: 'text-green-700',
    past: 'text-gray-600'
  };

  // Fetch meetings from API
  const fetchMeetings = async () => {
    try {
      const token = getToken();

      if (!token) {
        toast.error('Authentication required');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        toast.error('Authentication failed. Please login again.');
        setLoading(false);
        return;
      }

      if (response.status === 500) {
        toast.error('Server error. Please try again later.');
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (response.ok) {
        console.log('Fetched meetings:', data);
        setMeetings(data);
      } else {
        toast.error(data.message || 'Failed to fetch meetings');
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const checkOAuthStatus = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${API_URL}/oauth-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOauthStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to check OAuth status:', error);
    }
  };

  useEffect(() => {
    fetchMeetings();
    checkOAuthStatus();

    // Detect redirect back from Google OAuth (?oauth=success)
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') === 'success') {
      toast.success('✅ Google Calendar connected successfully!', { autoClose: 5000 });
      // Clean up the query param from the URL without triggering a page reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Get meetings for a specific date
  const getMeetingsForDate = (date) => {
    return meetings.filter(meeting => {
      // Check finalized slot first
      if (meeting.finalizedSlot && meeting.finalizedSlot.start) {
        const meetingDate = new Date(meeting.finalizedSlot.start);
        return meetingDate.toDateString() === date.toDateString();
      }
      
      // Check suggested slots
      if (meeting.suggestedSlots && meeting.suggestedSlots.length > 0) {
        return meeting.suggestedSlots.some(slot => {
          const slotDate = new Date(slot.start);
          return slotDate.toDateString() === date.toDateString();
        });
      }
      
      return false;
    });
  };

  // Day view helpers
  const getMeetingsForTimeSlot = (hour) => {
    return meetings.filter(meeting => {
      let meetingHour = null;
      let meetingDate = null;
      
      // Check finalized slot first
      if (meeting.finalizedSlot && meeting.finalizedSlot.start) {
        meetingHour = new Date(meeting.finalizedSlot.start).getHours();
        meetingDate = new Date(meeting.finalizedSlot.start);
      }
      // Check suggested slots
      else if (meeting.suggestedSlots && meeting.suggestedSlots.length > 0) {
        // Use the first suggested slot for display
        meetingHour = new Date(meeting.suggestedSlots[0].start).getHours();
        meetingDate = new Date(meeting.suggestedSlots[0].start);
      }
      
      return meetingHour === hour && meetingDate && meetingDate.toDateString() === currentDate.toDateString();
    });
  };

  // Get meeting display time
  const getMeetingDisplayTime = (meeting) => {
    if (meeting.finalizedSlot && meeting.finalizedSlot.start) {
      return {
        start: meeting.finalizedSlot.start,
        end: meeting.finalizedSlot.end
      };
    }
    
    if (meeting.suggestedSlots && meeting.suggestedSlots.length > 0) {
      return {
        start: meeting.suggestedSlots[0].start,
        end: meeting.suggestedSlots[0].end
      };
    }
    
    return null;
  };

  // Get meeting status
  const getMeetingStatus = (meeting) => {
    const now = new Date();
    let startTime = null;
    let endTime = null;
    
    if (meeting.finalizedSlot && meeting.finalizedSlot.start) {
      startTime = new Date(meeting.finalizedSlot.start);
      endTime = new Date(meeting.finalizedSlot.end);
    } else if (meeting.suggestedSlots && meeting.suggestedSlots.length > 0) {
      startTime = new Date(meeting.suggestedSlots[0].start);
      endTime = new Date(meeting.suggestedSlots[0].end);
    }
    
    if (!startTime || !endTime) return 'pending';
    
    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'ongoing';
    return 'past';
  };

  // Format time to 12-hour format
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToPreviousDay = () => {
    setCurrentDate(prev => new Date(prev.getTime() - 24 * 60 * 60 * 1000));
  };

  const goToNextDay = () => {
    setCurrentDate(prev => new Date(prev.getTime() + 24 * 60 * 60 * 1000));
  };

  // Handle meeting click
  const handleMeetingClick = (meeting) => {
    setSelectedMeeting(meeting);
    setShowPopup(true);
  };

  // Close popup
  const closePopup = () => {
    setShowPopup(false);
    setSelectedMeeting(null);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'month' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Month View
          </button>
          <button
            onClick={() => setView('day')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              view === 'day' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Day View
          </button>
        </div>

        {/* Google Calendar Connect Button */}
        <div>
          {oauthStatus === 'authorized' ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <svg className="mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
              Google Calendar Connected
            </span>
          ) : (
            <a
              href={`${API_URL}/google-auth`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
              </svg>
              Connect Google Calendar
            </a>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          {view === 'month' ? (
            <>
              <button
                onClick={goToPreviousMonth}
                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-semibold text-gray-800">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={goToPreviousDay}
                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-semibold text-gray-800">
                {currentDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
              <button
                onClick={goToNextDay}
                className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Today
        </button>
      </div>

      {/* Calendar Content */}
      {view === 'month' ? (
        <MonthView 
          currentDate={currentDate} 
          meetings={meetings} 
          getMeetingsForDate={getMeetingsForDate}
          handleMeetingClick={handleMeetingClick}
          statusColors={statusColors}
          getMeetingStatus={getMeetingStatus}
        />
      ) : (
        <DayView 
          currentDate={currentDate}
          meetings={meetings}
          getMeetingsForTimeSlot={getMeetingsForTimeSlot}
          handleMeetingClick={handleMeetingClick}
          statusColors={statusColors}
          formatTime={formatTime}
          getMeetingStatus={getMeetingStatus}
          getMeetingDisplayTime={getMeetingDisplayTime}
        />
      )}

      {/* No meetings message */}
      {!loading && meetings.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            📅 No meetings scheduled yet
          </div>
          <p className="text-gray-400">
            Your meetings will appear here once they are created.
          </p>
        </div>
      )}

      {/* Meeting Details Popup */}
      {showPopup && selectedMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-gray-800">{selectedMeeting.title}</h3>
              <button
                onClick={closePopup}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-gray-700">Date:</span>
                <p className="text-gray-600">
                  {(() => {
                    const displayTime = getMeetingDisplayTime(selectedMeeting);
                    if (displayTime) {
                      return new Date(displayTime.start).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                    }
                    return 'Date not set';
                  })()}
                </p>
              </div>
              
              <div>
                <span className="font-semibold text-gray-700">Time:</span>
                <p className="text-gray-600">
                  {(() => {
                    const displayTime = getMeetingDisplayTime(selectedMeeting);
                    if (displayTime) {
                      return `${formatTime(displayTime.start)} - ${formatTime(displayTime.end)}`;
                    }
                    return 'Time not set';
                  })()}
                </p>
              </div>
              
              {selectedMeeting.description && (
                <div>
                  <span className="font-semibold text-gray-700">Description:</span>
                  <p className="text-gray-600">{selectedMeeting.description}</p>
                </div>
              )}
              
              <div>
                <span className="font-semibold text-gray-700">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  statusColors[getMeetingStatus(selectedMeeting)]
                } text-white`}>
                  {getMeetingStatus(selectedMeeting).charAt(0).toUpperCase() + getMeetingStatus(selectedMeeting).slice(1)}
                </span>
              </div>

              <div>
                <span className="font-semibold text-gray-700">Meeting Type:</span>
                <p className="text-gray-600">
                  {selectedMeeting.finalizedSlot ? 'Finalized Meeting' : 'Planning Meeting'}
                </p>
              </div>

              {selectedMeeting.finalizedSlot && selectedMeeting.meetLink && (
                <div>
                  <span className="font-semibold text-gray-700">Meet Link:</span>
                  <a 
                    href={selectedMeeting.meetLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline block mt-1"
                  >
                    Join Meeting
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Month View Component
const MonthView = ({ currentDate, meetings, getMeetingsForDate, handleMeetingClick, statusColors, getMeetingStatus }) => {
  const days = getDaysInMonth(currentDate);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-gray-50">
        {dayNames.map(day => (
          <div key={day} className="p-3 text-center font-semibold text-gray-700 border-r border-gray-200">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => (
          <div
            key={index}
            className={`min-h-[120px] p-2 border-r border-b border-gray-200 ${
              day && day.toDateString() === new Date().toDateString() 
                ? 'bg-blue-50' 
                : 'bg-white'
            }`}
          >
            {day && (
              <>
                <div className={`text-sm font-medium mb-1 ${
                  day.toDateString() === new Date().toDateString() 
                    ? 'text-blue-600' 
                    : 'text-gray-700'
                }`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {getMeetingsForDate(day).slice(0, 3).map(meeting => (
                    <div
                      key={meeting._id}
                      onClick={() => handleMeetingClick(meeting)}
                      className={`text-xs p-1 rounded cursor-pointer truncate ${
                        statusColors[getMeetingStatus(meeting)]
                      } text-white hover:opacity-80 transition`}
                      title={meeting.title}
                    >
                      {meeting.title}
                    </div>
                  ))}
                  {getMeetingsForDate(day).length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{getMeetingsForDate(day).length - 3} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Day View Component
const DayView = ({ currentDate, meetings, getMeetingsForTimeSlot, handleMeetingClick, statusColors, formatTime, getMeetingStatus, getMeetingDisplayTime }) => {
  const timeSlots = getTimeSlots();

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[100px_1fr]">
        {/* Time column */}
        <div className="border-r border-gray-200">
          {timeSlots.map(hour => (
            <div key={hour} className="h-16 border-b border-gray-200 flex items-center justify-center">
              <span className="text-sm text-gray-500">
                {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </span>
            </div>
          ))}
        </div>

        {/* Events column */}
        <div className="relative">
          {timeSlots.map(hour => (
            <div key={hour} className="h-16 border-b border-gray-200 relative">
              {getMeetingsForTimeSlot(hour).map(meeting => {
                const displayTime = getMeetingDisplayTime(meeting);
                if (!displayTime) return null;
                
                const startHour = new Date(displayTime.start).getHours();
                const startMinute = new Date(displayTime.start).getMinutes();
                const endHour = new Date(displayTime.end).getHours();
                const endMinute = new Date(displayTime.end).getMinutes();
                
                const top = (startMinute / 60) * 100;
                const height = ((endHour - startHour) * 60 + (endMinute - startMinute)) / 60 * 100;
                
                return (
                  <div
                    key={meeting._id}
                    onClick={() => handleMeetingClick(meeting)}
                    className={`absolute left-2 right-2 rounded p-2 cursor-pointer ${
                      statusColors[getMeetingStatus(meeting)]
                    } text-white text-sm shadow-md hover:shadow-lg transition`}
                    style={{
                      top: `${top}%`,
                      height: `${Math.max(height, 20)}%`,
                      zIndex: 10
                    }}
                  >
                    <div className="font-medium truncate">{meeting.title}</div>
                    <div className="text-xs opacity-90">
                      {formatTime(displayTime.start)} - {formatTime(displayTime.end)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
