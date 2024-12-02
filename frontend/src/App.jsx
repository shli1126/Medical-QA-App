import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./App.css";
import sendBtn from "./assets/send.svg";
import record from "./assets/record.svg";
import medical from "./assets/medical.svg";
import newConversation from "./assets/new_conversation.svg";
import user from "./assets/user.svg";

function App() {
  const [input, setInput] = useState("");
  const msgEnd = useRef(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    msgEnd.current.scrollIntoView();
  }, [messages]);

  useEffect(() => {
    startNewConversation();
  }, []);

  const startNewConversation = async () => {
    try {
      const response = await axios.post('http://localhost:8080/conversation/new');
      setConversationId(response.data.id);
      setMessages([{
        text: "Start a conversation with ChatGP",
        isBot: true,
      }]);
    } catch (error) {
      console.error("Error starting new conversation:", error);
    }
  };

  const sendMessageToBackend = async (message) => {
    try {
      const response = await axios.post(`http://localhost:8080/conversation/${conversationId}`, { message });
      return response.data.response;
    } catch (error) {
      console.error("Error sending message to backend:", error);
      throw error;
    }
  };

  const handleSend = async () => {
    if (!input) return;
    const text = input;
    setInput("");
    setMessages([...messages, { text, isBot: false }]);
    try {
      const res = await sendMessageToBackend(text);
      setMessages([
        ...messages,
        { text, isBot: false },
        { text: res, isBot: true },
      ]);
    } catch (error) {
      console.error("Error in handleSend:", error);
    }
  };

  const handleEnter = async (e) => {
    if (e.key === "Enter") await handleSend();
  };

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("model", "whisper-1");

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          },
        }
      );
      setIsTranscribing(false);
      setInput(response.data.text);
    } catch (error) {
      console.error("Error in transcription:", error.response?.data || error.message);
      setIsTranscribing(false);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);

      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        transcribeAudio(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  return (
    <div className="App">
      <div className="sideBar">
        <div className="upperSide">
          <div className="upperSideTop">
            <div className="titleContainer">
              <div className="titleLine">
                <img src={medical} alt="Logo" className="logo" />
                <strong>ChatGP</strong>
              </div>
              <span className="subtitle">Your GPT-enhanced general practitioner</span>
            </div>
          </div>

          <button className="midBtn" onClick={startNewConversation}>
            <img src={newConversation} alt="new chat" className="addBtn" />
            New Conversation
          </button>
        </div>
      </div>

      <div className="main">
        <div className="chats">
          {messages.map((message, i) => (
            <div key={i} className={message.isBot ? "chat-container bot" : "chat-container user"}>
              {message.isBot && (
                <img
                  className="chatImg"
                  src={medical}
                  alt="gptlogo"
                />
              )}
              <div className="chat">
                <p className="txt">{message.text}</p>
              </div>
              {!message.isBot && (
                <img
                  className="chatImg"
                  src={user}
                  alt="user"
                />
              )}
            </div>
          ))}
          <div ref={msgEnd}></div>
        </div>

        <div className="chatFooter">
          <div className="inp">
            <button
              className="record"
              onMouseDown={handleStartRecording}
              onMouseUp={handleStopRecording}
              onTouchStart={handleStartRecording}
              onTouchEnd={handleStopRecording}
            >
              <img src={record} alt="Record" />
            </button>

            <input
              type="text"
              placeholder={
                isRecording
                  ? "Recording in progress..."
                  : isTranscribing
                  ? "Converting to text..."
                  : "Send a message"
              }
              value={input}
              onKeyDown={handleEnter}
              onChange={(e) => {
                setInput(e.target.value);
              }}
            />

            <button className="send" onClick={handleSend}>
              <img src={sendBtn} alt="Send" />
            </button>
          </div>
          <p>ChatGP can make mistakes. Check important information.</p>
        </div>
      </div>
    </div>
  );
}

export default App;