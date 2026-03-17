import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import { FontSizeProvider } from "./providers/themeProviders";
import { LanguageProvider } from "./providers/languageProvider";

export default function App() {
  return (
    <LanguageProvider>
      <FontSizeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </FontSizeProvider>
    </LanguageProvider>
  );
}