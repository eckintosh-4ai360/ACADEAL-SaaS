"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Check,
  X,
  Edit,
  Trash2,
  Video,
  Phone,
  Building,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";

type Meeting = {
  id: number;
  title: string;
  description: string | null;
  meetingType: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  status: string;
  teacher: { id: string; name: string; surname: string };
  parent: { id: string; name: string; surname: string };
  student: { id: string; name: string } | null;
  requestedBy: string;
  requestedAt: string;
  confirmedAt: string | null;
  cancellationReason: string | null;
};

type TimeSlot = {
  startTime: string;
  endTime: string;
};

type Availability = {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

type Blackout = {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
};

type Teacher = {
  id: string;
  name: string;
  surname: string;
};

type Student = {
  id: string;
  name: string;
  studentId: string;
};

export default function MeetingsPage() {
  const { data: session } = useSession();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [showMeetingDetails, setShowMeetingDetails] = useState<Meeting | null>(null);
  const [selectedTab, setSelectedTab] = useState<"upcoming" | "past" | "all" | "availability" | "blackouts">("upcoming");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  //* Availability & Blackouts
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showBlackoutModal, setShowBlackoutModal] = useState(false);
  
  //* New meeting form
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [meetingType, setMeetingType] = useState<"IN_PERSON" | "VIRTUAL" | "PHONE_CALL">("IN_PERSON");
  const [meetingLocation, setMeetingLocation] = useState("");

  const userRole = session?.user?.role as string;

  useEffect(() => {
    if (selectedTab === "upcoming" || selectedTab === "past" || selectedTab === "all") {
      fetchMeetings();
    } else if (selectedTab === "availability") {
      fetchAvailabilities();
    } else if (selectedTab === "blackouts") {
      fetchBlackouts();
    }

    if (userRole === "parent" || userRole === "admin") {
      fetchTeachers();
      fetchStudents();
    }
  }, [selectedTab]);

  useEffect(() => {
    if (selectedTeacher && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedTeacher, selectedDate]);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTab === "upcoming") params.set("upcoming", "true");
      if (selectedTab === "past") params.set("past", "true");

      const response = await fetch(`/api/meetings?${params}`);
      if (!response.ok) throw new Error("Failed to fetch meetings");
      const data = await response.json();
      setMeetings(data.meetings || []);
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/teachers");
      if (!response.ok) return;
      const data = await response.json();
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students");
      if (!response.ok) return;
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchAvailabilities = async () => {
    try {
      const response = await fetch("/api/meetings/availability");
      if (!response.ok) return;
      const data = await response.json();
      setAvailabilities(data.availabilities || []);
    } catch (error) {
      console.error("Error fetching availabilities:", error);
    }
  };

  const fetchBlackouts = async () => {
    try {
      const response = await fetch("/api/meetings/blackout?upcoming=true");
      if (!response.ok) return;
      const data = await response.json();
      setBlackouts(data.blackouts || []);
    } catch (error) {
      console.error("Error fetching blackouts:", error);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const dateString = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
      if (!selectedTeacher || !dateString) return;

      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getAvailableSlots",
          teacherId: selectedTeacher,
          date: dateString,
        }),
      });

      if (!response.ok) return;
      const data = await response.json();
      setAvailableSlots(data.slots || []);
    } catch (error) {
      console.error("Error fetching slots:", error);
    }
  };

  const handleCreateMeeting = async () => {
    if (!selectedTeacher || !selectedSlot || !selectedDate || !meetingTitle) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const dateString = format(selectedDate, "yyyy-MM-dd");
      
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: meetingTitle,
          description: meetingDescription,
          meetingType,
          date: dateString,
          startTime: `${dateString}T${selectedSlot.startTime}:00.000Z`,
          endTime: `${dateString}T${selectedSlot.endTime}:00.000Z`,
          location: meetingLocation || (meetingType === "VIRTUAL" ? "Google Meet (link will be provided)" : undefined),
          teacherId: selectedTeacher,
          studentId: selectedStudent || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to create meeting");

      await fetchMeetings();
      resetForm();
      setShowNewMeetingModal(false);
    } catch (error) {
      console.error("Error creating meeting:", error);
      alert("Failed to create meeting");
    }
  };

  const handleConfirmMeeting = async (meetingId: number) => {
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          meetingId,
        }),
      });

      if (!response.ok) throw new Error("Failed to confirm meeting");

      await fetchMeetings();
      if (showMeetingDetails) {
        setShowMeetingDetails(null);
      }
    } catch (error) {
      console.error("Error confirming meeting:", error);
    }
  };

  const handleCancelMeeting = async (meetingId: number, reason?: string) => {
    if (!reason) {
      reason = prompt("Please enter a cancellation reason:") || undefined;
    }

    try {
      const response = await fetch(`/api/meetings?id=${meetingId}&reason=${encodeURIComponent(reason || "")}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to cancel meeting");

      await fetchMeetings();
      if (showMeetingDetails) {
        setShowMeetingDetails(null);
      }
    } catch (error) {
      console.error("Error canceling meeting:", error);
    }
  };

  const resetForm = () => {
    setSelectedTeacher("");
    setSelectedStudent("");
    setSelectedDate(null);
    setAvailableSlots([]);
    setSelectedSlot(null);
    setMeetingTitle("");
    setMeetingDescription("");
    setMeetingType("IN_PERSON");
    setMeetingLocation("");
  };

  const [availDay, setAvailDay] = useState(1);
  const [availStart, setAvailStart] = useState("09:00");
  const [availEnd, setAvailEnd] = useState("17:00");

  const handleAddAvailability = async () => {
    try {
      const response = await fetch("/api/meetings/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: availDay,
          startTime: availStart,
          endTime: availEnd,
          isActive: true,
        }),
      });

      if (response.ok) {
        fetchAvailabilities();
        setShowAvailabilityModal(false);
      }
    } catch (error) {
      console.error("Error adding availability:", error);
    }
  };

  const [blackoutTitle, setBlackoutTitle] = useState("");
  const [blackoutDesc, setBlackoutDesc] = useState("");
  const [blackoutStart, setBlackoutStart] = useState("");
  const [blackoutEnd, setBlackoutEnd] = useState("");

  const handleAddBlackout = async () => {
    try {
      const response = await fetch("/api/meetings/blackout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: blackoutTitle,
          description: blackoutDesc,
          startTime: new Date(blackoutStart).toISOString(),
          endTime: new Date(blackoutEnd).toISOString(),
        }),
      });

      if (response.ok) {
        fetchBlackouts();
        setShowBlackoutModal(false);
        setBlackoutTitle("");
        setBlackoutDesc("");
        setBlackoutStart("");
        setBlackoutEnd("");
      }
    } catch (error) {
      console.error("Error adding blackout:", error);
    }
  };

  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlot, setRescheduleSlot] = useState<TimeSlot | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const handleReschedule = async (meetingId: number) => {
    if (!rescheduleDate || !rescheduleSlot) return;

    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          meetingId,
          newDate: rescheduleDate,
          newStartTime: `${rescheduleDate}T${rescheduleSlot.startTime}:00.000Z`,
          newEndTime: `${rescheduleDate}T${rescheduleSlot.endTime}:00.000Z`,
        }),
      });

      if (response.ok) {
        fetchMeetings();
        setShowMeetingDetails(null);
        setIsRescheduling(false);
        setRescheduleDate("");
        setRescheduleSlot(null);
      }
    } catch (error) {
      console.error("Error rescheduling meeting:", error);
    }
  };

  const [completionNotes, setCompletionNotes] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async (meetingId: number) => {
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          meetingId,
          notes: {
            [userRole === "teacher" ? "teacherNotes" : "parentNotes"]: completionNotes,
            followUpRequired,
          },
        }),
      });

      if (response.ok) {
        fetchMeetings();
        setShowMeetingDetails(null);
        setIsCompleting(false);
        setCompletionNotes("");
        setFollowUpRequired(false);
      }
    } catch (error) {
      console.error("Error completing meeting:", error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-yellow-500",
      CONFIRMED: "bg-green-500",
      RESCHEDULED: "bg-blue-500",
      CANCELLED: "bg-red-500",
      COMPLETED: "bg-gray-500",
      NO_SHOW: "bg-orange-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-green-100 text-green-800",
      RESCHEDULED: "bg-blue-100 text-blue-800",
      CANCELLED: "bg-red-100 text-red-800",
      COMPLETED: "bg-gray-100 text-gray-800",
      NO_SHOW: "bg-orange-100 text-orange-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case "VIRTUAL":
        return <Video className="w-4 h-4" />;
      case "PHONE_CALL":
        return <Phone className="w-4 h-4" />;
      default:
        return <Building className="w-4 h-4" />;
    }
  };

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const meetingsByDate = meetings.reduce((acc, meeting) => {
    const date = format(new Date(meeting.startTime), "yyyy-MM-dd");
    if (!acc[date]) acc[date] = [];
    acc[date].push(meeting);
    return acc;
  }, {} as Record<string, Meeting[]>);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Parent-Teacher Meetings</h1>
          <p className="text-muted-foreground mt-1">
            Schedule and manage meetings with parents and teachers
          </p>
        </div>
        {(userRole === "parent" || userRole === "teacher" || userRole === "admin") && (
          <button
            onClick={() => {
              resetForm();
              setShowNewMeetingModal(true);
            }}
            className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Schedule Meeting</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 mb-6 border-b border-border">
        <button
          onClick={() => setSelectedTab("upcoming")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            selectedTab === "upcoming"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setSelectedTab("all")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            selectedTab === "all"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Meetings
        </button>
        <button
          onClick={() => setSelectedTab("past")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            selectedTab === "past"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Past
        </button>
        {userRole === "teacher" && (
          <button
            onClick={() => setSelectedTab("availability")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedTab === "availability"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Availability Schedule
          </button>
        )}
        {(userRole === "admin" || userRole === "teacher") && (
          <button
            onClick={() => setSelectedTab("blackouts")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedTab === "blackouts"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Blackout Periods
          </button>
        )}
      </div>

      {/* Calendar View */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-muted rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1 text-sm bg-muted hover:bg-muted/80 rounded transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-muted rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {calendarDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayMeetings = meetingsByDate[dateKey] || [];
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] p-2 border border-border rounded ${
                  !isSameMonth(day, currentMonth) ? "bg-muted/30" : ""
                } ${isToday ? "bg-primary/10" : ""}`}
              >
                <div className="text-sm font-medium mb-1">
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayMeetings.slice(0, 3).map((meeting) => (
                    <div
                      key={meeting.id}
                      className={`text-xs p-1 rounded ${getStatusBadge(meeting.status)} cursor-pointer`}
                      onClick={() => setShowMeetingDetails(meeting)}
                    >
                      {format(new Date(meeting.startTime), "HH:mm")} - {meeting.title}
                    </div>
                  ))}
                  {dayMeetings.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{dayMeetings.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meetings List */}
      {(selectedTab === "upcoming" || selectedTab === "past" || selectedTab === "all") && (
        <div className="bg-card border border-border rounded-lg">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">
              {selectedTab === "upcoming" ? "Upcoming Meetings" : selectedTab === "past" ? "Past Meetings" : "All Meetings"}
            </h2>
          </div>

          {meetings.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No meetings found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setShowMeetingDetails(meeting)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 ${getStatusColor(meeting.status)} rounded-full`}></div>
                      <div>
                        <h3 className="font-semibold text-foreground">{meeting.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(meeting.startTime), "MMM dd, yyyy")}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {format(new Date(meeting.startTime), "HH:mm")} - {format(new Date(meeting.endTime), "HH:mm")}
                            </span>
                          </span>
                          <span className="flex items-center space-x-1">
                            {getMeetingTypeIcon(meeting.meetingType)}
                            <span>{meeting.location || (meeting.meetingType === "VIRTUAL" ? "Virtual" : "In Person")}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(meeting.status)}`}>
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Availability Section */}
      {selectedTab === "availability" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Weekly Recurring Availability</h2>
              <button
                onClick={() => setShowAvailabilityModal(true)}
                className="flex items-center space-x-2 bg-primary text-primary-foreground px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Time Slot</span>
              </button>
            </div>
            <div className="p-4">
              {availabilities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No availability slots set. Add slots to allow parents to book meetings.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availabilities.map((avail) => (
                    <div key={avail.id} className="p-4 border border-border rounded-lg bg-muted/30 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][avail.dayOfWeek]}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {avail.startTime} - {avail.endTime}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm("Delete this availability slot?")) {
                            const res = await fetch(`/api/meetings/availability?id=${avail.id}`, { method: "DELETE" });
                            if (res.ok) fetchAvailabilities();
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Blackouts Section */}
      {selectedTab === "blackouts" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Scheduled Blackout Periods</h2>
              {(userRole === "admin" || userRole === "teacher") && (
                <button
                  onClick={() => setShowBlackoutModal(true)}
                  className="flex items-center space-x-2 bg-primary text-primary-foreground px-3 py-1 rounded text-sm hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Blackout</span>
                </button>
              )}
            </div>
            <div className="p-4">
              {blackouts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No blackout periods scheduled.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {blackouts.map((blackout) => (
                    <div key={blackout.id} className="p-4 border border-border rounded-lg bg-muted/30 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{blackout.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(blackout.startTime), "PPP p")} - {format(new Date(blackout.endTime), "PPP p")}
                        </p>
                        {blackout.description && <p className="text-sm mt-1">{blackout.description}</p>}
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm("Delete this blackout period?")) {
                            const res = await fetch(`/api/meetings/blackout?id=${blackout.id}`, { method: "DELETE" });
                            if (res.ok) fetchBlackouts();
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Meeting Modal */}
      {showNewMeetingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <h2 className="text-xl font-bold text-foreground">Schedule Meeting</h2>
              <button
                onClick={() => {
                  setShowNewMeetingModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-muted rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="e.g., Progress Discussion"
                />
              </div>

              {userRole === "parent" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Teacher *
                    </label>
                    <select
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name} {teacher.surname}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Student (Optional)
                    </label>
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">Select Student</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name} ({student.studentId})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Meeting Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setMeetingType("IN_PERSON")}
                    className={`p-3 border border-border rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                      meetingType === "IN_PERSON" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <Building className="w-5 h-5" />
                    <span>In Person</span>
                  </button>
                  <button
                    onClick={() => setMeetingType("VIRTUAL")}
                    className={`p-3 border border-border rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                      meetingType === "VIRTUAL" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <Video className="w-5 h-5" />
                    <span>Virtual</span>
                  </button>
                  <button
                    onClick={() => setMeetingType("PHONE_CALL")}
                    className={`p-3 border border-border rounded-lg flex items-center justify-center space-x-2 transition-colors ${
                      meetingType === "PHONE_CALL" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    }`}
                  >
                    <Phone className="w-5 h-5" />
                    <span>Phone Call</span>
                  </button>
                </div>
              </div>

              {meetingType === "IN_PERSON" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    placeholder="e.g., Room 101"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={meetingDescription}
                  onChange={(e) => setMeetingDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  rows={3}
                  placeholder="Brief description of the meeting purpose"
                />
              </div>

              {selectedTeacher && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Select Date *
                    </label>
                    <input
                      type="date"
                      value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => setSelectedDate(new Date(e.target.value))}
                      min={format(new Date(), "yyyy-MM-dd")}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>

                  {selectedDate && availableSlots.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Available Time Slots *
                      </label>
                      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                        {availableSlots.map((slot, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-2 border border-border rounded-lg text-sm transition-colors ${
                              selectedSlot === slot
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                          >
                            {slot.startTime} - {slot.endTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDate && availableSlots.length === 0 && (
                    <div className="flex items-center space-x-2 text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                      <AlertCircle className="w-5 h-5" />
                      <div className="text-sm">
                        <p className="font-medium">No available slots for this date.</p>
                        <p className="opacity-80">The teacher may not have set their availability for this day, or all slots are booked/blacked out.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end space-x-3 sticky bottom-0 bg-card">
              <button
                onClick={() => {
                  setShowNewMeetingModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMeeting}
                disabled={!selectedTeacher || !selectedSlot || !meetingTitle}
                className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Check className="w-5 h-5" />
                <span>Schedule Meeting</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Details Modal */}
      {showMeetingDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg w-full max-w-lg">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{showMeetingDetails.title}</h2>
              <button
                onClick={() => setShowMeetingDetails(null)}
                className="p-2 hover:bg-muted rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(showMeetingDetails.status)}`}>
                  {showMeetingDetails.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {format(new Date(showMeetingDetails.startTime), "EEEE, MMMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {format(new Date(showMeetingDetails.startTime), "HH:mm")} - {format(new Date(showMeetingDetails.endTime), "HH:mm")}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  {getMeetingTypeIcon(showMeetingDetails.meetingType)}
                  <span className="text-foreground">
                    {showMeetingDetails.location || "Location TBD"}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Teacher</p>
                    <p className="font-medium text-foreground">
                      {showMeetingDetails.teacher.name} {showMeetingDetails.teacher.surname}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Parent</p>
                    <p className="font-medium text-foreground">
                      {showMeetingDetails.parent.name} {showMeetingDetails.parent.surname}
                    </p>
                  </div>
                  {showMeetingDetails.student && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Student</p>
                      <p className="font-medium text-foreground">{showMeetingDetails.student.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {showMeetingDetails.description && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-foreground">{showMeetingDetails.description}</p>
                </div>
              )}

              {showMeetingDetails.cancellationReason && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground mb-1">Cancellation Reason</p>
                  <p className="text-foreground">{showMeetingDetails.cancellationReason}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end space-x-3">
              {showMeetingDetails.status === "PENDING" && userRole === "teacher" && (
                <>
                  <button
                    onClick={() => handleCancelMeeting(showMeetingDetails.id)}
                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                    <span>Decline</span>
                  </button>
                  <button
                    onClick={() => handleConfirmMeeting(showMeetingDetails.id)}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-5 h-5" />
                    <span>Confirm</span>
                  </button>
                </>
              )}

              {showMeetingDetails.status === "CONFIRMED" && !isRescheduling && !isCompleting && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsRescheduling(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Clock className="w-5 h-5" />
                    <span>Reschedule</span>
                  </button>
                  {userRole === "teacher" && (
                    <button
                      onClick={() => setIsCompleting(true)}
                      className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-5 h-5" />
                      <span>Complete</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleCancelMeeting(showMeetingDetails.id)}
                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}

              {isRescheduling && (
                <div className="w-full space-y-4 p-4 border border-border rounded-lg bg-muted/30">
                  <h3 className="font-semibold">Reschedule Meeting</h3>
                  <div>
                    <label className="block text-sm mb-1">New Date</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full p-2 border border-border rounded bg-background"
                    />
                  </div>
                  {rescheduleDate && (
                    <button
                      onClick={async () => {
                        const res = await fetch("/api/meetings", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            action: "getAvailableSlots",
                            teacherId: showMeetingDetails.teacher.id,
                            date: rescheduleDate,
                          }),
                        });
                        const data = await res.json();
                        setAvailableSlots(data.slots || []);
                      }}
                      className="text-sm text-primary"
                    >
                      Check Availability
                    </button>
                  )}
                  {availableSlots.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto mt-2">
                      {availableSlots.map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => setRescheduleSlot(slot)}
                          className={`p-2 text-xs border rounded ${rescheduleSlot === slot ? "bg-primary text-white" : "hover:bg-muted"}`}
                        >
                          {slot.startTime} - {slot.endTime}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end space-x-2 mt-4">
                    <button onClick={() => setIsRescheduling(false)} className="px-3 py-1 text-sm bg-muted rounded">Cancel</button>
                    <button
                      onClick={() => handleReschedule(showMeetingDetails.id)}
                      disabled={!rescheduleSlot}
                      className="px-3 py-1 text-sm bg-primary text-white rounded disabled:opacity-50"
                    >
                      Confirm New Time
                    </button>
                  </div>
                </div>
              )}

              {isCompleting && (
                <div className="w-full space-y-4 p-4 border border-border rounded-lg bg-muted/30">
                  <h3 className="font-semibold">Complete Meeting</h3>
                  <div>
                    <label className="block text-sm mb-1">Meeting Notes</label>
                    <textarea
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      className="w-full p-2 border border-border rounded bg-background h-24"
                      placeholder="Enter details of the discussion..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="followup"
                      checked={followUpRequired}
                      onChange={(e) => setFollowUpRequired(e.target.checked)}
                      className="rounded border-border"
                    />
                    <label htmlFor="followup" className="text-sm">Follow-up required</label>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button onClick={() => setIsCompleting(false)} className="px-3 py-1 text-sm bg-muted rounded">Cancel</button>
                    <button
                      onClick={() => handleComplete(showMeetingDetails.id)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded"
                    >
                      Mark as Completed
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Availability Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Add Recurring Availability</h2>
              <button onClick={() => setShowAvailabilityModal(false)}><X /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Day of Week</label>
                <select
                  value={availDay}
                  onChange={(e) => setAvailDay(parseInt(e.target.value))}
                  className="w-full p-2 border border-border rounded bg-background"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    value={availStart}
                    onChange={(e) => setAvailStart(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={availEnd}
                    onChange={(e) => setAvailEnd(e.target.value)}
                    className="w-full p-2 border border-border rounded bg-background"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button onClick={() => setShowAvailabilityModal(false)} className="px-4 py-2 bg-muted rounded">Cancel</button>
                <button
                  onClick={handleAddAvailability}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded"
                >
                  Save Availability
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blackout Modal */}
      {showBlackoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Schedule Blackout Period</h2>
              <button onClick={() => setShowBlackoutModal(false)}><X /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={blackoutTitle}
                  onChange={(e) => setBlackoutTitle(e.target.value)}
                  placeholder="e.g., Staff Training"
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start (Date & Time)</label>
                <input
                  type="datetime-local"
                  value={blackoutStart}
                  onChange={(e) => setBlackoutStart(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End (Date & Time)</label>
                <input
                  type="datetime-local"
                  value={blackoutEnd}
                  onChange={(e) => setBlackoutEnd(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                <textarea
                  value={blackoutDesc}
                  onChange={(e) => setBlackoutDesc(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background h-20"
                />
              </div>
              <div className="pt-4 flex justify-end space-x-2">
                <button onClick={() => setShowBlackoutModal(false)} className="px-4 py-2 bg-muted rounded">Cancel</button>
                <button
                  onClick={handleAddBlackout}
                  disabled={!blackoutTitle || !blackoutStart || !blackoutEnd}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"
                >
                  Create Blackout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
