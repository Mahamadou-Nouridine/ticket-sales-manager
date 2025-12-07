import { Sidebar, MobileSidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-muted/40">
            <Sidebar />
            <div className="flex-1 flex flex-col md:pl-64 transition-all duration-300">
                <header className="flex h-14 items-center gap-4 border-b bg-background px-6 md:hidden">
                    <MobileSidebar />
                    <div className="font-semibold">Ticket Manager</div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
