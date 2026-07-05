import './globals.css';

export const metadata = {
  title: 'KasiCart — Your WhatsApp shop, made shareable',
  description:
    'Turn your WhatsApp selling into a shareable Quick-Store. Customers order and pay with MoMo in a few taps.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f9d58',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
