import { ServiceTable } from "@/components/ServiceTable";

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8 w-full">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ECS Dashboard</h1>
      <ServiceTable />
    </main>
  );
}
