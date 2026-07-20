import './globals.css';

export const metadata = {
  title: 'AI Code Review Assistant',
  description: 'Automated static analysis and AI-powered code review',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
