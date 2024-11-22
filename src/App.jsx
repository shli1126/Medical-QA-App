import "./App.css";
import gptLogo from "./assets/chatgpt.svg";
import addBtn from "./assets/add-30.png";
import sendBtn from "./assets/send.svg";
import userIcon from "./assets/user-icon.png";
import gptImgLogo from "./assets/chatgptLogo.svg";
import { sendMsgToOpenAI } from "./openai";
import { useEffect, useState } from "react";
import { useRef } from "react";
import axios from "axios";

function App() {
  const [input, setInput] = useState("");
  const msgEnd = useRef(null);
  const [messages, setMessages] = useState([
    {
      text: "Start a conversation with Medical Q&A",
      isBot: true,
    },
  ]);

  const [selectedFile, setSelectedFile] = useState(null);
  const [transcriptionText, setTranscriptionText] = useState("");

  useEffect(() => {
    msgEnd.current.scrollIntoView();
  }, [messages]);

  const handleSend = async () => {
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    console.log(file);
    if (file) {
      setSelectedFile(file);
      transcribeFile(file);
    }
  };

  const transcribeFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
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

      console.log("Transcription:", response.data.text);
      setTranscriptionText(response.data.text);
    } catch (error) {
      if (error.response) {
        console.error("Error in transcription:", error.response.data);
      } else {
        console.error("Error in transcription:", error.message);
      }
    }
  };

  return (
    <div className="App">
      <div className="sideBar">
        <div className="upperSide">
          <div className="upperSideTop">
            <img src={gptLogo} alt="Logo" className="logo" />
            <span className="brand">Medical Q&A App</span>
          </div>

          <button
            className="midBtn"
            onClick={() => {
              window.location.reload();
            }}
          >
            <img src={addBtn} alt="new chat" className="addBtn" />
            New Chat
          </button>

          <input
            type="file"
            accep=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm"
            onChange={handleFileChange}
          />
          {transcriptionText && (
            <div>
              <h2>Transcription Result:</h2>
              <p>{transcriptionText}</p>
            </div>
          )}
        </div>
        <div>
          <h1>Med 277 Team #5</h1>
          <h1>Anmol Budhiraja</h1>
          <h1>Hitvarth Diwanji</h1>
          <h1>Shaolong Li</h1>
        </div>
      </div>

      <div className="main">
        <div className="chats">
          {messages.map((message, i) => (
            <div key={i} className={message.isBot ? "chat bot" : "chat"}>
              <img
                className="chatImg"
                src={message.isBot ? gptImgLogo : userIcon}
                alt="gptlogo"
              />
              <p className="txt">{message.text}</p>
            </div>
          ))}
          <div ref={msgEnd}></div>
        </div>

        <div className="chatFooter">
          <div className="inp">

            <input
              type="text"
              placeholder="Send a message"
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
          <p>Medical Q&A may produce inaccurate result</p>
        </div>
      </div>
    </div>
  );
}

export default App;
