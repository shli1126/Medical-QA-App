import React from "react";
import "./Home.css";
import { motion } from "framer-motion";
import medical from "./assets/medical.svg";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const handleStartChatting = () => {
    navigate("/app");
  };

  return (
    <div className="container">
      <motion.h1
        className="title"
        style={{ overflow: "hidden", whiteSpace: "nowrap" }}
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 2, ease: "easeInOut" }}
      >
        <img src={medical} alt="Logo" className="logo" />
        ChatGP: Your GPT-enhanced General Practitioner!
      </motion.h1>

      <button className="startButton" onClick={handleStartChatting}>
        Start Chatting!
      </button>
    </div>
  );
};

export default Home;
