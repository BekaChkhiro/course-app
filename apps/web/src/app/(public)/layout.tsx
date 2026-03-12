import { Metadata } from 'next';
import { Header, Footer } from '@/components/public';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
