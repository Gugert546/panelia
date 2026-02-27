
import ClockWidgetMock from "../Widgets/builtins/ClockWidget/ClockWidget";
import SearchWidgetMock from "../Widgets/builtins/searchWidget/GoogleSearchWidget";
import Sidebar from "../../components/sidebar";
import NewsWidget from "../Widgets/builtins/NewsWidget/NewsWidget";
import WeatherWidgetUI from "../Widgets/builtins/WeatherWidget/WeatherWidgetUI";
import Chat from "../../components/chatUI";
import { useState } from "react";
import BookmarkUi from "../Widgets/builtins/BookmarkWidget/BookmarkUi";
import AuthMenu from "../../components/authmenu";
import sol1 from "../../../assets/panelia-bg/Sol 1.png";
import sol2 from "../../../assets/panelia-bg/Sol 2.png";
import sol3 from "../../../assets/panelia-bg/Sol 3.png";
import natt1 from "../../../assets/panelia-bg/Natt 1.png";
import natt2 from "../../../assets/panelia-bg/Natt 2.png";
import natt3 from "../../../assets/panelia-bg/Natt 3.png";
import { useEffect } from "react";

export default function DashboardPage() {
  const SIDEBAR_WIDTH = 86;
  const [isChatVisible, setIsChatVisible] = useState(false);


// Natt - Dag oppdatering
    const [, setTime] = useState(new Date());

    useEffect(() => {
      const interval = setInterval(() => {
        setTime(new Date());
      }, 60000); // oppdater hvert minutt

      return () => clearInterval(interval);
    }, []);

  // Funksjon for å toggle chat-vinduet 
  const toggleChat = () => {
    setIsChatVisible((prev) => !prev);
  };

  const getBackgroundByTime = () => {
  const hour = new Date().getHours();

  // DAG
  if (hour >= 6 && hour < 8) return sol1; // Mellom 05:00 og 08:00 her
  if (hour >= 8 && hour < 11) return sol2; // Mellom 08:00 og 11:00 her
  if (hour >= 11 && hour < 17) return sol3; // Mellom 11:00 og 17:00 osv...
  if (hour >= 17 && hour < 20) return sol2;

  // KVELD
  if (hour >= 20 && hour < 23) return natt1;

  // NATT
  if (hour >= 23 || hour < 2) return natt2;
  if (hour >= 2 && hour < 3) return natt3;
  if (hour >= 3 && hour < 5) return natt2;
  if (hour >= 5 && hour < 6) return natt1;

  return sol1;
};

  return (
    <div
      style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          backgroundImage: `url(${getBackgroundByTime()})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
    >
      <Sidebar />
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 1000,
      }}
    >
      <AuthMenu />
    </div>
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