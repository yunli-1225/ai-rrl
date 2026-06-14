import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI RRL — 智能简历定制助手',
  description: '根据职位描述自动生成针对性简历，支持 STAR 格式、多模板、智能匹配',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
