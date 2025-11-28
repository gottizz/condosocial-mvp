"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase.config";
import { useTheme } from "../ThemeContext";
import Link from "next/link";

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-yellow-300 transition-all">
      {isDark ? "☀️" : "🌙"}
    </button>
  );
};

export default function VecinosPage() {
  const [vecinos, setVecinos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVecinos = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        const vecinosData = querySnapshot.docs.map(doc => doc.data());
        // Filtramos para no mostrar al admin si por casualidad se guardó ahí
        // y nos aseguramos de que tengan nombre
        setVecinos(vecinosData.filter(v => v.rol !== 'admin' && v.nombre));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchVecinos();
  }, []);

  // Mapa de iconos para intereses
  const iconos:Record<string, string> = {
    mascotas: "🐶", deporte: "⚽", auto: "🚗", jardin: "🌿", 
    musica: "🎵", tech: "💻", cocina: "🍳", lectura: "📚"
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 p-6">
      <nav className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-2">
          ← Volver al Muro
        </Link>
        <ThemeToggle />
      </nav>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                Directorio de Vecinos
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
                Conoce a quienes viven a tu lado y conecta por intereses.
            </p>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20">
              <p className="text-xl dark:text-white animate-pulse">Cargando comunidad...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {vecinos.map((vecino, index) => (
              <Link href={`/profile/${vecino.uid}`} key={index} className="block group h-full">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center h-full flex flex-col">
                  
                  {/* Avatar con Iniciales */}
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-violet-600 p-1 mb-4 shadow-md group-hover:scale-110 transition-transform">
                    <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                         <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-violet-600">
                            {vecino.nombre ? vecino.nombre[0].toUpperCase() : '?'}
                         </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {vecino.nombre}
                  </h3>
                  
                  <span className="inline-block bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 mb-4 mx-auto">
                    Torre {vecino.torre} - {vecino.depto}
                  </span>

                  {/* Intereses (Tribus) */}
                  <div className="flex flex-wrap justify-center gap-2 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    {vecino.intereses && vecino.intereses.length > 0 ? (
                        vecino.intereses.map((int: string) => (
                        <span key={int} className="text-lg" title={int}>
                            {iconos[int] || '✨'}
                        </span>
                        ))
                    ) : (
                        <span className="text-xs text-gray-400 italic">Sin intereses aún</span>
                    )}
                  </div>
                  
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}