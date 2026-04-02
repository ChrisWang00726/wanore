import { useEffect, useRef, useState } from "react";
import MeetingList from "./MeetingList";
import MeetingView from "./MeetingView";
import RecordingPanel from "./RecordingPanel";

declare global {
  interface Window {
    google: any;
  }
}

type LoginResponse = {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  name: string;
};

type MeetingResponse = {
  id: string;
  owner_user_id: string;
  title: string;
  summary: string | null;
  transcript?: string | null;
  audio_url?: string | null;
  created_at: string;
  updated_at: string;
};

export default function App() {
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [title, setTitle] = useState("");
  const [meetingError, setMeetingError] = useState("");
  const [createdMeeting, setCreatedMeeting] = useState<MeetingResponse | null>(
    null,
  );
  const [loadingMeeting, setLoadingMeeting] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [processStatus, setProcessStatus] = useState("");
  const [generatedTranscript, setGeneratedTranscript] = useState("");
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [processingSummary, setProcessingSummary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [shareEmail, setShareEmail] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  type MeetingsState = {
    owned: MeetingResponse[];
    shared: MeetingResponse[];
  };

  const [meetings, setMeetings] = useState<MeetingsState>({
    owned: [],
    shared: [],
  });

  const [selectedMeeting, setSelectedMeeting] =
    useState<MeetingResponse | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(
        document.getElementById("googleSignInDiv"),
        { theme: "outline", size: "large" },
      );
    };

    document.body.appendChild(script);
  }, []);

  async function shareMeeting() {
    try {
      if (!selectedMeeting) {
        throw new Error("No meeting selected");
      }

      const trimmedEmail = shareEmail.trim();
      if (!trimmedEmail) {
        throw new Error("Email is required");
      }

      const token = getToken();
      setIsSharing(true);
      setShareStatus("Sharing...");

      const response = await fetch(
        `${API_BASE_URL}/meetings/${selectedMeeting.id}/share`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: trimmedEmail,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Share failed");
      }

      setShareStatus(data.message || "Shared successfully");
      setShareEmail("");
      await fetchMeetings();
    } catch (err: any) {
      console.error(err);
      setShareStatus(err.message || "Share failed");
    } finally {
      setIsSharing(false);
    }
  }

  async function handleCredentialResponse(response: any) {
    try {
      resetAppState();
      setUserEmail("");
      setMessage("Logging in...");

      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_token: response.credential,
        }),
      });

      const data: LoginResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as any).detail || "Login failed");
      }

      localStorage.setItem("access_token", data.access_token);
      const meRes = await fetch(`${API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      const meData = await meRes.json();

      if (!meRes.ok) {
        throw new Error(meData.detail || "Failed to fetch /me");
      }

      console.log("/me success:", meData);
      console.log("Stored backend token:", data.access_token);
      console.log(
        "Stored in localStorage:",
        localStorage.getItem("access_token"),
      );
      setCreatedMeeting(null);
      setSelectedMeeting(null);

      setMeetings({
        owned: [],
        shared: [],
      });

      setIsSharing(false);
      setUserEmail(data.email);
      await fetchMeetings();
    } catch (error: any) {
      console.error(error);
      setMessage(error.message || "Login failed");
    }
  }

  function resetAppState() {
    setCreatedMeeting(null);
    setSelectedMeeting(null);

    setMeetings({
      owned: [],
      shared: [],
    });

    setTitle("");
    setMeetingError("");

    setIsRecording(false);
    setRecordingStatus("");
    setAudioUrl("");
    setAudioBlob(null);
    setUploadStatus("");
    setProcessStatus("");
    setGeneratedTranscript("");
    setGeneratedSummary("");
    setProcessingSummary(false);
    setIsUploading(false);

    setShareEmail("");
    setShareStatus("");
    setIsSharing(false);
  }

  async function handleCreateMeeting(e: React.FormEvent) {
    e.preventDefault();
    setMeetingError("");
    setCreatedMeeting(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setMeetingError("Title is required");
      return;
    }

    try {
      setLoadingMeeting(true);

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: trimmedTitle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create meeting");
      }
      setShareEmail("");
      setShareStatus("");
      setCreatedMeeting(data);
      setSelectedMeeting(null);
      await fetchMeetings();

      setTitle("");
      setRecordingStatus("");
      setAudioUrl("");
      setAudioBlob(null);
      setUploadStatus("");
      setProcessStatus("");
      setGeneratedTranscript("");
      setGeneratedSummary("");
      setMessage("");
    } catch (err: any) {
      console.error(err);
      setMeetingError(err.message || "Failed to create meeting");
    } finally {
      setLoadingMeeting(false);
    }
  }

  async function startRecording() {
    try {
      setGeneratedSummary("");
      setGeneratedTranscript("");
      setProcessStatus("");
      setUploadStatus("");
      setAudioUrl("");
      setAudioBlob(null);
      setRecordingStatus("Requesting microphone and tab audio...");

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const displayAudioTracks = displayStream.getAudioTracks();

      if (displayAudioTracks.length === 0) {
        micStream.getTracks().forEach((track) => track.stop());
        displayStream.getTracks().forEach((track) => track.stop());

        throw new Error(
          "No meeting audio was captured. Choose the meeting browser tab and enable 'Share tab audio'.",
        );
      }

      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);

      const displayAudioStream = new MediaStream(displayAudioTracks);
      const displaySource =
        audioContext.createMediaStreamSource(displayAudioStream);
      displaySource.connect(destination);

      const mixedStream = destination.stream;

      streamRef.current = new MediaStream([
        ...micStream.getTracks(),
        ...displayStream.getTracks(),
      ]);

      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(mixedStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "audio/webm",
        });

        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        setRecordingStatus("Recording complete");

        micStream.getTracks().forEach((track) => track.stop());
        displayStream.getTracks().forEach((track) => track.stop());
        audioContext.close();
        streamRef.current = null;
        console.log("blob type:", blob.type);
        console.log("MediaRecorder mimeType:", mediaRecorder.mimeType);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStatus("Recording started. Make sure tab audio is enabled.");
    } catch (error: any) {
      console.error("startRecording error:", error);
      setRecordingStatus(
        `Could not start recording: ${error?.message || "unknown error"}`,
      );
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) {
      return;
    }

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setRecordingStatus("Stopping recording...");
  }

  async function uploadAudio() {
    try {
      if (!createdMeeting) {
        throw new Error("No meeting selected");
      }

      if (!audioBlob) {
        throw new Error("No audio recording available");
      }

      const token = getToken();

      setIsUploading(true);
      setUploadStatus("Uploading audio...");

      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      const response = await fetch(
        `${API_BASE_URL}/meetings/${createdMeeting.id}/upload-audio`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setCreatedMeeting((prev) =>
        prev
          ? {
              ...prev,
              audio_url: data.audio_url,
            }
          : prev,
      );

      setUploadStatus("Upload successful");
    } catch (error: any) {
      console.error(error);
      setUploadStatus(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function generateSummary() {
    try {
      if (!createdMeeting) {
        throw new Error("No meeting selected");
      }

      const token = getToken();

      setProcessingSummary(true);
      setProcessStatus("Processing audio... (~30s)");
      setGeneratedTranscript("");
      setGeneratedSummary("");

      const response = await fetch(
        `${API_BASE_URL}/meetings/${createdMeeting.id}/process-audio`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process audio");
      }

      setGeneratedTranscript(data.transcript || "");
      setGeneratedSummary(data.summary || "");
      setProcessStatus("Summary generated successfully");
      await fetchMeetings();
    } catch (error: any) {
      console.error(error);
      setProcessStatus(error.message || "Processing failed");
    } finally {
      setProcessingSummary(false);
    }
  }

  async function fetchMeetings() {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/meetings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (res.ok) {
      setMeetings(data);
    }
  }
  async function fetchPlayableAudioUrl(meetingId: string) {
    const token = getToken();

    const res = await fetch(`${API_BASE_URL}/meetings/${meetingId}/audio-url`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Failed to fetch audio URL");
    }

    return data.audio_url as string;
  }

  async function loadMeeting(id: string) {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/meetings/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const fullMeeting = await res.json();

    if (res.ok) {
      let playableAudioUrl: string | null = null;

      if (fullMeeting.audio_url) {
        try {
          playableAudioUrl = await fetchPlayableAudioUrl(id);
        } catch (error) {
          console.error("Failed to load playable audio URL:", error);
        }
      }

      setCreatedMeeting(null);
      setShareEmail("");
      setShareStatus("");
      setGeneratedSummary("");
      setGeneratedTranscript("");
      setProcessStatus("");
      setUploadStatus("");
      setAudioUrl("");
      setAudioBlob(null);
      setRecordingStatus("");

      setSelectedMeeting({
        ...fullMeeting,
        audio_url: playableAudioUrl,
      });
    }
  }
  function getToken() {
    const token = localStorage.getItem("access_token");
    if (!token) {
      throw new Error("You must log in first");
    }
    return token;
  }

  function normalizeAudioUrl(url?: string | null) {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Wanore</h1>

      <div id="googleSignInDiv"></div>
      <p>{message}</p>
      {userEmail && <p>Logged in as: {userEmail}</p>}

      <hr style={{ margin: "2rem 0" }} />

      {/* CENTERED CONTAINER */}
      <div style={{ width: "1044px" }}>
        <div
          style={{
            display: "flex",
            gap: "24px",
            alignItems: "flex-start",
          }}
        >
          {/* LEFT SIDE (FIXED) */}
          <div style={{ width: "320px", flexShrink: 0 }}>
            <RecordingPanel
              title={title}
              setTitle={setTitle}
              handleCreateMeeting={handleCreateMeeting}
              loadingMeeting={loadingMeeting}
              meetingError={meetingError}
              createdMeeting={createdMeeting}
              isRecording={isRecording}
              startRecording={startRecording}
              stopRecording={stopRecording}
              recordingStatus={recordingStatus}
              audioUrl={audioUrl}
              audioBlob={audioBlob}
              uploadAudio={uploadAudio}
              isUploading={isUploading}
              uploadStatus={uploadStatus}
              generateSummary={generateSummary}
              processingSummary={processingSummary}
              processStatus={processStatus}
              generatedSummary={generatedSummary}
              generatedTranscript={generatedTranscript}
            />

            <MeetingList meetings={meetings} onSelect={loadMeeting} />
          </div>

          {/* RIGHT SIDE (FIXED) */}
          <div style={{ width: "700px", flexShrink: 0 }}>
            <MeetingView
              meeting={selectedMeeting}
              normalizeAudioUrl={normalizeAudioUrl}
              shareEmail={shareEmail}
              setShareEmail={setShareEmail}
              shareMeeting={shareMeeting}
              shareStatus={shareStatus}
              isSharing={isSharing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
