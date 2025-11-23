"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../../firebase.config";
import { useTheme } from "../ThemeContext"; // Solo importamos el hook, NO el Provider

// --- TIPOS ---
interface Comentario { id: string; texto: string; autor: string; fecha: any; }
interface Anuncio { id: string; contenido: string; autor: string; fecha: any; }
interface Reporte { id: string; contenido: string; autor: string; esAnonimo: boolean; fecha: any; }

// --- COMPONENTE: BOTÓN DE TEMA ---
const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="p-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-yellow-300">
      {isDark ? "☀️" : "🌙"}
    </button>
  );
};

// --- COMPONENTE: TARJETA DE ANUNCIO (VERSIÓN ADMIN) ---
const AnuncioCard = ({ anuncio }: { anuncio: Anuncio }) => {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    if (mostrar) {
      const q = query(collection(db, "anuncios", anuncio.id, "comentarios"), orderBy("fecha", "asc"));
      return onSnapshot(q, (snap) => setComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comentario))));
    }
  }, [mostrar, anuncio.id]);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 shadow-sm">
      <div className="flex justify-between mb-2">
        <span className="font-bold text-blue-600 dark:text-blue-400">{anuncio.autor}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {anuncio.fecha?.seconds ? new Date(anuncio.fecha.seconds * 1000).toLocaleDateString() : ''}
        </span>
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-3 text-sm whitespace-pre-wrap">{anuncio.contenido}</p>
      
      <button onClick={() => setMostrar(!mostrar)} className="text-xs font-bold text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400">
        {mostrar ? "Ocultar" : `Ver Comentarios (${comentarios.length})`}
      </button>

      {mostrar && (
        <div className="mt-3 pl-3 border-l-2 border-gray-200 dark:border-gray-600 space-y-2">
          {comentarios.map(com => (
            <div key={com.id} className="text-xs">
              <span className="font-bold text-gray-800 dark:text-gray-200 mr-2">{com.autor}:</span>
              <span className="text-gray-600 dark:text-gray-400">{com.texto}</span>
            </div>
          ))}
          {comentarios.length === 0 && <p className="text-xs text-gray-400">Sin comentarios.</p>}
        </div>
      )}
    </div>
  );
};

// --- PÁGINA PRINCIPAL DEL ADMIN ---
export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados Formularios
  const [nuevoAnuncio, setNuevoAnuncio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [docNombre, setDocNombre] = useState("");
  const [uploading, setUploading] = useState(false);
  
  // Datos
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [reportes, setReportes] = useState<Reporte[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u?.email === "admin@condosocial.app") setUser(u);
      else router.push("/");
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      const qAnuncios = query(collection(db, "anuncios"), orderBy("fecha", "desc"));
      const unsubAnuncios = onSnapshot(qAnuncios, (s) => setAnuncios(s.docs.map(d => ({ id: d.id, ...d.data() } as Anuncio))));
      
      const qReportes = query(collection(db, "reportes"), orderBy("fecha", "desc"));
      const unsubReportes = onSnapshot(qReportes, (s) => setReportes(s.docs.map(d => ({ id: d.id, ...d.data() } as Reporte))));

      return () => { unsubAnuncios(); unsubReportes(); };
    }
  }, [user]);

  const handlePublicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoAnuncio.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "anuncios"), {
        contenido: nuevoAnuncio,
        fecha: serverTimestamp(),
        autor: "Administración"
      });
      setNuevoAnuncio("");
    } catch (e) { console.error(e); }
    finally { setIsSubmitting(false); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !docNombre) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `gastos/${Date.now()}_${file.name}`);
      const task = uploadBytesResumable(storageRef, file);
      
      task.on('state_changed', null, console.error, async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await addDoc(collection(db, "documentos"), {
          nombre: docNombre, url, fecha: serverTimestamp(), fileType: file.type
        });
        setFile(null); setDocNombre(""); 
        setUploading(false);
        alert("¡Recibo subido con éxito!");
      });
    } catch (e) {
      console.error(e);
      setUploading(false);
    }
  };

  if (loading || !user) return <div className="p-10 text-black dark:text-white">Cargando panel...</div>;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">Panel Admin</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-500 dark:text-gray-400">Logueado como</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white">{user.email}</p>
            </div>
            <button 
              onClick={() => signOut(auth)} 
              className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* COLUMNA 1: Herramientas de Gestión */}
          <div className="space-y-6">
            
            {/* Formulario Publicar */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                📢 Publicar Oficial
              </h2>
              <form onSubmit={handlePublicar} className="space-y-3">
                <textarea 
                  value={nuevoAnuncio} onChange={e => setNuevoAnuncio(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-black dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Escribe un comunicado importante..." rows={4}
                />
                <button 
                  disabled={isSubmitting || !nuevoAnuncio.trim()} 
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Publicando..." : "Publicar en el Muro"}
                </button>
              </form>
            </div>

            {/* Formulario Subir Recibo */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                🧾 Subir Recibo
              </h2>
              <form onSubmit={handleUpload} className="space-y-3">
                <input 
                  type="text" value={docNombre} onChange={e => setDocNombre(e.target.value)}
                  placeholder="Nombre del documento (Ej: Gastos Octubre)"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-black dark:text-white text-sm focus:ring-2 focus:ring-green-500 outline-none"
                />
                <input 
                  type="file" 
                  onChange={e => setFile(e.target.files?.[0] || null)} 
                  className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900/30 dark:file:text-green-400" 
                  accept=".pdf,.jpg,.png" 
                />
                <button 
                  disabled={uploading || !file || !docNombre} 
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {uploading ? "Subiendo..." : "Subir Documento"}
                </button>
              </form>
            </div>
          </div>

          {/* COLUMNA 2: Vista del Muro */}
          <div className="md:col-span-1">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-full max-h-[800px] overflow-y-auto custom-scrollbar">
              <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4 sticky top-0 bg-gray-50 dark:bg-gray-900/50 py-2 z-10">
                👁️ Vista del Muro
              </h2>
              <div className="space-y-4">
                {anuncios.map(anuncio => (
                  <AnuncioCard key={anuncio.id} anuncio={anuncio} />
                ))}
                {anuncios.length === 0 && <p className="text-sm text-gray-400 text-center">No hay anuncios.</p>}
              </div>
            </div>
          </div>

          {/* COLUMNA 3: Buzón de Reportes */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full max-h-[800px] overflow-y-auto custom-scrollbar">
              <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2 sticky top-0 bg-white dark:bg-gray-800 py-2 z-10">
                🚨 Reportes Recibidos <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">{reportes.length}</span>
              </h2>
              <div className="space-y-3">
                {reportes.map(reporte => (
                  <div key={reporte.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${reporte.esAnonimo ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                        {reporte.esAnonimo ? '🕵️ Anónimo' : reporte.autor.split('@')[0]}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {reporte.fecha?.seconds ? new Date(reporte.fecha.seconds * 1000).toLocaleDateString() : 'Ahora'}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed font-medium">"{reporte.contenido}"</p>
                  </div>
                ))}
                {reportes.length === 0 && <div className="text-center py-10"><p className="text-gray-400 text-sm">Todo tranquilo. No hay reportes.</p></div>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}