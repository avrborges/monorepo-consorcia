// src/pages/dashboard/Overview.tsx
// 🆕 Importamos el icono de saludo desde react-icons
import { HiHand } from "react-icons/hi";

export default function Overview() {
  // Recuperamos los datos del usuario logueado para mostrar su nombre
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : { name: "Usuario" };

  return (
    <div className="space-y-2">
      {/* 🆕 Estructuramos el título en un flexbox para alinear el icono al lado del texto */}
      <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
        ¡Hola, {user.name}! 
      </h1>
      <p className="text-sm text-slate-500">
        Bienvenido al sistema de gestión de Consorcia.
      </p>
    </div>
  );
}