import './globals.css';

export const metadata = {
  title: 'শিখো ফিজিক্স ল্যাব — এসএসসি ৩ডি সিমুলেশন',
  description: 'শিখবো, জিতবো! এনসিটিবি পদার্থবিজ্ঞান নবম-দশম শ্রেণির ১৪টি অধ্যায়ের বাস্তব-দৃশ্য ৩ডি সিমুলেশন।',
};
export const viewport = { themeColor: '#07140e', width: 'device-width', initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Baloo+Da+2:wght@500;600;700;800&family=Hind+Siliguri:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
