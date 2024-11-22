import "./App.css";
import sendBtn from "./assets/send.svg";
import gptImgLogo from "./assets/chatgpt.svg";
import record from "./assets/record.svg";
import medical from "./assets/medical.svg";
import newConversation from "./assets/new_conversation.svg";
import user from "./assets/user.svg";
import team from "./assets/team.svg";
import memeber from "./assets/member.svg";
import { sendMsgToOpenAI } from "./openai";
import { useEffect, useState } from "react";
import { useRef } from "react";
import axios from "axios";

function App() {
  const [input, setInput] = useState("");
  const msgEnd = useRef(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Start a conversation with Medical Q&A",
      isBot: true,
    },
  ]);

  useEffect(() => {
    msgEnd.current.scrollIntoView();
  }, [messages]);

  const handleSend = async () => {
    if (!input) return;
    const text = input;
    setInput("");
    setMessages([...messages, { text, isBot: false }]);
    const res = await sendMsgToOpenAI(text);
    setMessages([
      ...messages,
      { text, isBot: false },
      { text: res, isBot: true },
    ]);
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
      if (error.response) {
        console.error("Error in transcription:", error.response.data);
      } else {
        console.error("Error in transcription:", error.message);
      }
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
            <img src={medical} alt="Logo" className="logo" />
            <span className="brand">Medical Q&A GPT</span>
          </div>

          <button
            className="midBtn"
            onClick={() => {
              window.location.reload();
            }}
          >
            <img src={newConversation} alt="new chat" className="addBtn" />
            New Conversation
          </button>
        </div>
        <div className="lowerSide">
          <img src={team} alt="team" className="team" />
          <h1>Team #5</h1>
          <div></div>
        </div>
        <div className="group">
          <div className="individual">
            <img src={memeber} alt="member" className="member" />
            <h2>Anmol Budhiraja</h2>
          </div>
          <div className="individual">
            <img src={memeber} alt="member" className="member" />
            <h2>Hitvarth Diwanji</h2>
          </div>
          <div className="individual">
            <img src={memeber} alt="member" className="member" />
            <h2>Shaolong Li</h2>
          </div>
        </div>
      </div>

      <div className="main">
        <div className="chats">
          {messages.map((message, i) => (
            <div key={i} className={message.isBot ? "chat bot" : "chat"}>
              <img
                className="chatImg"
                src={message.isBot ? gptImgLogo : user}
                alt="gptlogo"
              />
              <p className="txt">{message.text}</p>
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
          <p>Medical Q&A GPT can make mistakes. Check important info.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
