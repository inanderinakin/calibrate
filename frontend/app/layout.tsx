import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Calibrate",
  description: "AI-powered CV analysis and personalized learning roadmap.",
};

// viewportFit cover is what makes env(safe-area-inset-*) report anything other
// than 0, so the sidebar can keep its content clear of the notch and the home bar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs while the HTML is still parsing, before anything paints. The providers used
// to start on light/English and correct themselves in an effect, so a dark-mode
// Turkish account got a white flash and then watched every string swap.
const applyPreferences = `
(function () {
  try {
    var theme = localStorage.getItem("calibrate_theme");
    if (theme !== "light" && theme !== "dark") {
      theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.classList.toggle("dark", theme === "dark");

    var language = localStorage.getItem("calibrate_language");
    if (language === "en" || language === "tr") {
      document.documentElement.lang = language;
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: applyPreferences }} />
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>{children}</AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
