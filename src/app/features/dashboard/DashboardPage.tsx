
import ClockWidgetMock from "../Widgets/builtins/ClockWidget/ClockWidget.tsx";
import SearchWidgetMock from "../Widgets/builtins/searchWidget/GoogleSearchWidget";
import Sidebar from "../../components/sidebar";
import bg from "../../../assets/sol.png";
import NewsWidget from "../Widgets/builtins/NewsWidget/NewsWidget.tsx";



export default function DashboardPage() {
    const SIDEBAR_WIDTH = 86;

//sidebar
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
          <NewsWidget />
        </div>
      </main>
    </div>
  );
}