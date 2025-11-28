"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "../../../firebase.config";
import { useTheme } from "../../ThemeContext";
import Link from "next/link";

// Opciones para los intereses
const INTERESES_OPTIONS = [
  { id: "mascotas", label: "🐶 Mascotas" },
  { id: "deporte", label: "⚽ Deporte" },
  { id: "auto", label: "🚗 Auto" },
  { id: "jardin", label: "🌿 Jardín" },
  { id: "musica", label: "🎵 Música" },
  { id: "tech", label: "💻 Tech" },
  { id: "cocina", label: "🍳 Cocina" },
  { id: "lectura", label: "📚 Lectura" },
];

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-yellow-300 transition-all">
      {isDark ? "☀️" : "🌙"}
    </button>
  );
};

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  
  // Estados de Datos
  const [perfil, setPerfil] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados de Edición
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Campos del Formulario
  const [editNombre, setEditNombre] = useState("");
  const [editTorre, setEditTorre] = useState("");
  const [editDepto, setEditDepto] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editIntereses, setEditIntereses] = useState<string[]>([]);

  // 1. Detectar Usuario Logueado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. Cargar Perfil
  useEffect(() => {
    const fetchPerfil = async () => {
      if (!params.id) return;
      try {
        const docRef = doc(db, "usuarios", params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setPerfil(data);
          // Cargar datos al formulario
          setEditNombre(data.nombre || "");
          setEditTorre(data.torre || "");
          setEditDepto(data.depto || "");
          setEditTelefono(data.telefono || "");
          setEditIntereses(data.intereses || []);
        } else {
          setPerfil(null);
        }
      } catch (error) {
        console.error("Error buscando perfil:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPerfil();
  }, [params.id]);

  // 3. Función Guardar Cambios
  const handleGuardar = async () => {
    if (!currentUser || !perfil) return;
    setSaving(true);

    try {
      const docRef = doc(db, "usuarios", params.id as string);
      
      await updateDoc(docRef, {
        nombre: editNombre,
        torre: editTorre,
        depto: editDepto,
        telefono: editTelefono,
        intereses: editIntereses
      });

      setPerfil({
        ...perfil,
        nombre: editNombre,
        torre: editTorre,
        depto: editDepto,
        telefono: editTelefono,
        intereses: editIntereses
      });
      
      setIsEditing(false);
      alert("¡Perfil actualizado correctamente!");
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const toggleInteres = (id: string) => {
    if (editIntereses.includes(id)) {
      setEditIntereses(editIntereses.filter(i => i !== id));
    } else {
      setEditIntereses([...editIntereses, id]);
    }
  };

  const iconos: Record<string, string> = {
    mascotas: "🐶", deporte: "⚽", auto: "🚗", jardin: "🌿", 
    musica: "🎵", tech: "💻", cocina: "🍳", lectura: "📚"
  };

  if (loading) return <div className="flex h-screen items-center justify-center dark:bg-gray-900 dark:text-white">Cargando perfil...</div>;

  if (!perfil) return (
    <div className="flex flex-col h-screen items-center justify-center dark:bg-gray-900 dark:text-white gap-4">
      <p className="text-xl">Usuario no encontrado 😢</p>
      <button onClick={() => router.back()} className="text-blue-500 hover:underline">Volver</button>
    </div>
  );

  const esMiPerfil = currentUser?.uid === perfil.uid;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 p-6">
      <nav className="max-w-4xl mx-auto flex justify-between items-center mb-8">
        <Link href="/dashboard" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">← Volver al Muro</Link>
        <div className="flex gap-4 items-center">
          {esMiPerfil && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 py-1 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              ✏️ Editar Perfil
            </button>
          )}
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 relative overflow-hidden">
        
        <div className="h-32 bg-gradient-to-r from-blue-500 to-violet-600"></div>
        
        <div className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-800 absolute top-20 left-1/2 transform -translate-x-1/2 bg-blue-600 flex items-center justify-center shadow-md z-10">
          <span className="text-4xl font-bold text-white">
            {perfil.nombre ? perfil.nombre.split(' ').map((n:string) => n[0]).join('').substring(0, 2).toUpperCase() : '?'}
          </span>
        </div>
        
        <div className="px-8 pb-8 pt-20 text-center">
          
          {isEditing ? (
            <div className="space-y-4 text-left animate-in fade-in duration-300">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Nombre</label>
                <input 
                  type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-transparent text-black dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Torre</label>
                  <input 
                    type="text" value={editTorre} onChange={e => setEditTorre(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-transparent text-black dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Depto</label>
                  <input 
                    type="text" value={editDepto} onChange={e => setEditDepto(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-transparent text-black dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Teléfono (WhatsApp)</label>
                <input 
                  type="tel" value={editTelefono} onChange={e => setEditTelefono(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-transparent text-black dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="999999999"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block">Mis Intereses</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESES_OPTIONS.map(opcion => (
                    <button
                      key={opcion.id}
                      onClick={() => toggleInteres(opcion.id)}
                      className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                        editIntereses.includes(opcion.id)
                          ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleGuardar} disabled={saving} className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </div>

          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{perfil.nombre}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{perfil.email}</p>
              
              <div className="flex justify-center gap-2 mb-6">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  🏢 Torre {perfil.torre || '?'} - {perfil.depto || '?'}
                </span>
              </div>

              {perfil.intereses && perfil.intereses.length > 0 && (
                <div className="mb-8">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Intereses</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {perfil.intereses.map((int: string) => (
                      <span key={int} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                        {iconos[int] || int}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {perfil.telefono ? (
                <a 
                  href={`https://wa.me/51${perfil.telefono}`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm hover:shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.099-.446.049-.594.136-.136.297-.347.446-.521.149-.173.198-.297.297-.495.099-.198.05-.372-.025-.521-.074-.149-.669-1.611-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                  <span>Chatear por WhatsApp</span>
                </a>
              ) : (
                 <p className="text-sm text-gray-400 mt-6 bg-gray-100 dark:bg-gray-700/50 py-2 px-4 rounded-lg inline-block border border-gray-200 dark:border-gray-600">
                   📴 Este vecino no ha compartido su teléfono.
                 </p>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}