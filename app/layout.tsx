// app/layout.tsx
import './globals.css';

export const metadata = {
  title: 'TASQ JAPAN',
  description: '逆オークションMVP',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
