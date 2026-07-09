import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "GreenCred | Strava for Eco Actions",
  description: "Track your eco-friendly actions, earn credits, and compete on the leaderboard.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen flex flex-col`}>
        <AuthProvider>
          {children}
          <Toaster 
            position="bottom-center" 
            toastOptions={{
              style: {
                borderRadius: '16px',
                background: '#333',
                color: '#fff',
                padding: '12px 24px',
                fontWeight: 'bold',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
