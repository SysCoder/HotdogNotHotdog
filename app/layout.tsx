import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Hot Dog / Not Hot Dog — The ASCII Experiment',
  description: 'Paste a photo, see it as ASCII art, and let Jev decide whether it is a hot dog.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
