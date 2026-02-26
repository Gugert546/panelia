
// GENERELLE IMPORTS

import bg from "../../../assets/sol.png";
import Sidebar from "../../components/sidebar";
import Chat from "../../components/chatUI";
import EditPanel from "../../components/editPanel";

// REACT IMPORT:

import { useState } from "react";

// WIDGETS IMPORTS:

import NewsWidget from "../Widgets/builtins/NewsWidget/NewsWidget.tsx";
import WeatherWidgetUI from "../Widgets/builtins/WeatherWidget/WeatherWidgetUI";
import SearchWidgetMock from "../Widgets/builtins/searchWidget/GoogleSearchWidget";
import ClockWidgetMock from "../Widgets/builtins/ClockWidget/ClockWidget.tsx";



export default function DashboardPage() {

  const SIDEBAR_WIDTH = 86;

  const [isChatVisible, setIsChatVisible] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Funksjon for å toggle chat-vinduet
  const toggleChat = () => {
    setIsChatVisible((prev) => !prev);
  };
 
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >

      {/* Toggle når Rediger trykkes */}
      <Sidebar onEditClick={() => setEditOpen(prev => !prev)} />

      {/* Rediger-panel */}
      <EditPanel open={editOpen} onClose={() => setEditOpen(false)} />

      {/* INNHOLD */}
      <main
        style={{
          marginLeft: SIDEBAR_WIDTH,
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingTop: 220,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            alignItems: "center",
          }}
        >
          <ClockWidgetMock />
          <SearchWidgetMock />
          <WeatherWidgetUI />
          <NewsWidget />
          
        </div>
      </main>

      {/* Chat Toggle Button */}
      <button
        onClick={toggleChat}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          padding: "10px 20px",
          fontSize: "16px",
          color: "#fff",
          backgroundColor: "#007BFF",
          border: "none",
          borderRadius: "50px",
          cursor: "pointer",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        {isChatVisible ? "Close Chat" : "Open Chat"}
      </button>

      {/* Chat Window */}
      {isChatVisible && (
        <div
          style={{
            position: "fixed",
            bottom: 80, //høyde fra bunn av skjermen
            right: 20, //lengde fra høyre kant
          }}
        >
          <Chat />
        </div>
      )}
    </div>
  );
}