import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { ClientSidebar } from '@/components/client/ClientSidebar';
import { ClientHeader } from '@/components/client/ClientHeader';

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  
  if (!session) {
    redirect('/login?returnUrl=/client');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <ClientSidebar />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <ClientHeader />
          
          {/* Page content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
