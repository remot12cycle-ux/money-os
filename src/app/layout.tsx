import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Money OS", template: "%s · Money OS" },
  description: "Private finance control room.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = (await cookies()).get("theme")?.value ?? "dark";
  const htmlClass = theme === "light" ? "" : theme === "dark" ? "dark" : "";
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${htmlClass} h-full antialiased`}
    >
      <head>
        {theme === "system" ? (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark')",
            }}
          />
        ) : null}
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast:
                "!bg-raised !text-ink !border !border-hairline !shadow-float !rounded-md !text-sm",
              actionButton: "!bg-mint !text-on-mint",
            },
          }}
        />
      </body>
    </html>
  );
}
