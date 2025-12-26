import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Project Jam',
  description: 'Dual-agent orchestration layer - Claude builds, Gemini supervises',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
