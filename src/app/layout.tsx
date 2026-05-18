import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeakLens | AI 商业秘密合规工具",
  description: "企业商业秘密泄露风险识别、脱敏改写、审批留痕与培训案例生成 MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
