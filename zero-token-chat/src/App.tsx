import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useSettingsStore } from "@/store/settingsStore";
import ChatPage from "@/pages/ChatPage";
import CookiePage from "@/pages/CookiePage";
import SettingsPage from "@/pages/SettingsPage";

export default function App() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <Router>
      <div className="flex h-screen bg-[var(--bg)] text-[var(--text)]">
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/cookies" element={<CookiePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </Router>
  );
}
