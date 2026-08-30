import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import MotionPreferences from "@/components/MotionPreferences";

// Hasköy, SIL OFL 1.1, licence in app/fonts/OFL.txt. One variable file covers the whole
// 100-800 range and it carries the full Turkish set, which the interface needs on every
// screen. Self hosted, so it is not a third party request on the critical path. The
// variable is named for the slot rather than the face, so swapping fonts is this one line.
const appFont = localFont({
  src: "./fonts/Haskoy-variable.woff2",
  variable: "--font-app",
  weight: "100 800",
  display: "swap",
});

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
    // The font variable has to live on <html>, not <body>. Tailwind declares
    // --font-sans on :root, and a var() inside a custom property resolves against the
    // element that declares it, so with the variable one level down on <body> the
    // whole --font-sans declaration computed to invalid and font-family fell back.
    <html lang="en" className={appFont.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <script dangerouslySetInnerHTML={{ __html: applyPreferences }} />
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <MotionPreferences>{children}</MotionPreferences>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
