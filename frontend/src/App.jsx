import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import UploadPage from "@/pages/UploadPage";
import RealtimePage from "@/pages/RealtimePage";
import StudentsPage from "@/pages/StudentsPage";
import HistoryPage from "@/pages/HistoryPage";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/realtime" element={<RealtimePage />} />
            <Route path="/students" element={<StudentsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          className:
            "glass-strong !text-foreground !border-white/30 dark:!border-white/10",
        }}
      />
    </ThemeProvider>
  );
}
