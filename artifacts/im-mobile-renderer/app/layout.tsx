import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "IM Mobile Renderer",
  description: "IM Mobile Renderer",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Tailwind CDN */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
