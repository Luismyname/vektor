import { useEffect, useState } from "react";
import { getUsersCount } from "../../services/users";
import { getEvents } from "../../services/events";
import DashboardCard from "./components/DashboardCard";

export default function Dashboard() {
  const [users, setUsers] = useState(0);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    async function load() {
      const usersCount = await getUsersCount();
      const eventsList = await getEvents();

      setUsers(usersCount);
      setEvents(eventsList);
    }

    load();
  }, []);

  return (
    <div className="p-8 text-white bg-black min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <DashboardCard title="Usuarios" value={users} />
        <DashboardCard title="Eventos" value={events.length} />
        <DashboardCard title="Estado" value="OK" />
      </div>

      <div className="bg-neutral-900 p-6 rounded-xl">
        <h2 className="text-xl mb-4">Actividad reciente</h2>
        <ul>
          {events.map((e) => (
            <li key={e.id} className="border-b border-neutral-700 py-2">
              {e.type} — {e.created_at}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
