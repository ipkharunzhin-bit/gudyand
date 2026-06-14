import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Яндекс Маркет — управление цифровыми товарами",
  description: "Автоматическая отправка цифровых товаров покупателям на Яндекс Маркете",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-white text-black antialiased">
        {children}
      </body>
    </html>
  );
}