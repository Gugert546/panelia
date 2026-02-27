
import ClockWidgetMock from "../Widgets/builtins/ClockWidget/ClockWidget.tsx";
import SearchWidgetMock from "../Widgets/builtins/searchWidget/GoogleSearchWidget";
import Sidebar from "../../components/sidebar";
import bg from "../../../assets/sol.png";
import NewsWidget from "../Widgets/builtins/NewsWidget/NewsWidget.tsx";
import WeatherWidgetUI from "../Widgets/builtins/WeatherWidget/WeatherWidgetUI";
import Chat from "../../components/chatUI";
import { useState } from "react";
import BookmarkUi from "../Widgets/builtins/BookmarkWidget/BookmarkUi.tsx";

export default function DashboardPage() {
  const SIDEBAR_WIDTH = 86;
  const [isChatVisible, setIsChatVisible] = useState(false);

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
      <Sidebar />

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
          <BookmarkUi />
          
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