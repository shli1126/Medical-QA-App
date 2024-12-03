import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import "./App.css";
import sendBtn from "./assets/send.svg";
import record from "./assets/record.svg";
import medical from "./assets/medical.svg";
import newConversation from "./assets/new_conversation.svg";
import user from "./assets/user.svg";
import ReactMarkdown from 'react-markdown';

function App() {
  const [input, setInput] = useState("");
  const msgEnd = useRef(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [recentConversations, setRecentConversations] = useState([]);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [currentConversationMessages, setCurrentConversationMessages] = useState(null);

  const fetchRecentConversations = async () => {
    if (!conversationId) return;
    try {
      console.log("Fetching recent conversations for ID:", conversationId);
      const response = await axios.get(`http://localhost:8080/conversation/recent?currentId=${conversationId}`);
      console.log("Recent conversations response:", response.data);
      setRecentConversations(response.data);
    } catch (error) {
      console.error("Error fetching recent conversations:", error.response?.data || error.message);
    }
  };

  const loadConversation = async (id) => {
    try {
      // Store current conversation messages if not already stored
      if (!isViewingHistory && !currentConversationMessages) {
        setCurrentConversationMessages(messages);
      }
      setIsViewingHistory(true);
      const response = await axios.get(`http://localhost:8080/conversation/${id}`);
      const conversation = response.data;
      setMessages(conversation.messages.map(msg => ({
        text: msg.content,
        isBot: !msg.is_user
      })));
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const returnToCurrentConversation = () => {
    if (currentConversationMessages) {
      setMessages(currentConversationMessages);
      setIsViewingHistory(false);
    }
  };

  const startNewConversation = async () => {
    try {
      // Save the old conversation ID for history update
      const oldConversationId = conversationId;
      
      // Start new conversation
      const response = await axios.post('http://localhost:8080/conversation/new');
      setConversationId(response.data.id);
      setMessages([{
        text: "Start a conversation with ChatGP",
        isBot: true,
      }]);
      setIsViewingHistory(false);
      setCurrentConversationMessages(null);

      // Update recent conversations to include the previous conversation
      if (oldConversationId) {
        const historyResponse = await axios.get(`http://localhost:8080/conversation/recent?currentId=${response.data.id}`);
        setRecentConversations(historyResponse.data);
      }
    } catch (error) {
      console.error("Error starting new conversation:", error);
    }
  };

  const sendMessageToBackend = async (message) => {
    try {
      const response = await axios.post(`http://localhost:8080/conversation/${conversationId}/message`, { message });
      return response.data.response;
    } catch (error) {
      console.error("Error sending message to backend:", error);
      throw error;
    }
  };

  const handleSend = async () => {
    if (!input || isViewingHistory) return;
    const text = input;
    setInput("");
    setMessages(prev => {
      const newMessages = [...prev, { text, isBot: false }];
      setCurrentConversationMessages(newMessages);
      return newMessages;
    });
    try {
      const res = await sendMessageToBackend(text);
      setMessages(prev => {
        const newMessages = [...prev, { text: res, isBot: true }];
        setCurrentConversationMessages(newMessages);
        return newMessages;
      });
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

  useEffect(() => {
    msgEnd.current.scrollIntoView();
  }, [messages]);

  useEffect(() => {
    startNewConversation();
  }, []);

  useEffect(() => {
    fetchRecentConversations();
  }, [messages]);

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
        <div className="lowerSide">
          <h2 className="historyHeader">History</h2>
          <div className="conversationList">
            {recentConversations.map(conv => (
              <div
                key={conv.id}
                className="conversationItem"
                onClick={() => loadConversation(conv.id)}
              >
                <div className="conversationPreview">
                  {conv.messages[0]?.content.substring(0, 50)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="main">
        <div className="chats">
          {isViewingHistory && (
            <div className="return-to-current">
              <button onClick={returnToCurrentConversation} className="return-btn">
                Return to Current Conversation
              </button>
            </div>
          )}
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
                {message.isBot ? (
                  <ReactMarkdown>{message.text}</ReactMarkdown>
                ) : (
                  <p className="txt">{message.text}</p>
                )}
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
              placeholder={isViewingHistory ? "Start a new conversation to chat" : isRecording ? "Recording in progress..." : isTranscribing ? "Converting to text..." : "Send a message"}
              value={input}
              onKeyDown={handleEnter}
              onChange={(e) => setInput(e.target.value)}
              disabled={isViewingHistory}
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