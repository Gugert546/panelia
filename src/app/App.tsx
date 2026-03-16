import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { FontSizeProvider } from "./providers/themeProviders";

export default function App() {
  return (
    <FontSizeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </FontSizeProvider>
  );
}