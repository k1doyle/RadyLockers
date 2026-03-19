import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rady Lockers',
  description: 'UC San Diego Rady School locker management system.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
