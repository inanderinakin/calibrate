import type { Metadata } from "next";

//main font for the app 
import { Inter } from "next/font/google";

//import des styles globaux de l'appication 
import "./globals.css";

//provider de thème partagé (dark/light) pour toutes les pages
import { ThemeProvider } from "@/contexts/ThemeContext";

const inter = Inter({
  //inter configs
  subsets: ["latin"], //lattin chars 
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Calibrate your AI-powered cv analyser",
  description: "Analyze your resume and discover job opportunities tailored to your skills and experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}