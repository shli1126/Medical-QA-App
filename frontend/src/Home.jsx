import React from "react";
import "./Home.css";
import { motion } from "framer-motion";
import medical from "./assets/medical.svg";
import record from "./assets/record.svg";
import sendBtn from "./assets/send.svg";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  const handleSendClick = () => {
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
        Welcome to ChatGP, let's chat!
      </motion.h1>

      <div className="inp">
        <button className="record">
          <img src={record} alt="Record" />
        </button>
        <input
          type="text"
          placeholder={"Send a message"}
          onClick={() => handleSendClick()}
        />
        <button className="send">
          <img src={sendBtn} alt="Send" />
        </button>
      </div>
    </div>
  );
};

export default Home;
