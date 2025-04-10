import './globals.css';

export const metadata = {
  title: 'useSTT Example',
  description: 'Example of using the useSTT hook for speech-to-text',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
} 