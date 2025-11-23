"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase.config";
import { useTheme } from "../ThemeContext";

// --- TIPOS ---
interface Comentario { id: string; texto: string; autor: string; fecha: any; }
interface Anuncio { id: string; contenido: string; autor: string; fecha: any; }
interface Documento { id: string; nombre: string; url: string; fecha: any; fileType?: string; }

// --- COMPONENTE: BOTÓN MODO OSCURO ---
const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button 
      onClick={toggleTheme}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-yellow-300 transition-all"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
};

// --- COMPONENTE: TARJETA DE ANUNCIO ---
const AnuncioCard = ({ anuncio, userEmail }: { anuncio: Anuncio, userEmail: string }) => {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [mostrarComentarios, setMostrarComentarios] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (mostrarComentarios) {
      const q = query(collection(db, "anuncios", anuncio.id, "comentarios"), orderBy("fecha", "asc"));
      return onSnapshot(q, (snap) => setComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comentario))));
    }
  }, [mostrarComentarios, anuncio.id]);

  const handleComentar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoComentario.trim()) return;
    setEnviando(true);
    try {
      await addDoc(collection(db, "anuncios", anuncio.id, "comentarios"), {
        texto: nuevoComentario,
        autor: userEmail.split('@')[0],
        fecha: serverTimestamp()
      });
      setNuevoComentario("");
    } catch (err) { console.error(err); } 
    finally { setEnviando(false); }
  };

  const esAdmin = anuncio.autor === "Administración";

  return (
    <div className={`rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border 
      ${esAdmin ? 'bg-blue-50/50 border-blue-100 dark:bg-slate-800 dark:border-slate-700' : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700'}`}>
      
      <div className="flex items-center mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm mr-3
          ${esAdmin ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white'}`}>
          {anuncio.autor[0].toUpperCase()}
        </div>
        <div>
          <h3 className={`font-bold text-lg ${esAdmin ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
            {anuncio.autor} {esAdmin && "⭐"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {anuncio.fecha?.seconds ? new Date(anuncio.fecha.seconds * 1000).toLocaleDateString() : 'Justo ahora'}
          </p>
        </div>
      </div>

      <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap leading-relaxed text-[15px]">
        {anuncio.contenido}
      </p>
      
      <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-end">
        <button 
          onClick={() => setMostrarComentarios(!mostrarComentarios)}
          className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold flex items-center hover:bg-indigo-50 dark:hover:bg-slate-700 px-3 py-1 rounded-lg transition-colors"
        >
          💬 {comentarios.length > 0 ? `${comentarios.length} Comentarios` : "Comentar"}
        </button>
      </div>

      {mostrarComentarios && (
        <div className="mt-4 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl">
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto scrollbar-thin">
            {comentarios.map(com => (
              <div key={com.id} className="flex gap-3 group">
                <div className="flex-1 bg-white dark:bg-gray-800 p-3 rounded-r-xl rounded-bl-xl shadow-sm text-sm">
                  <span className="font-bold text-gray-900 dark:text-white block text-xs mb-1">{com.autor}</span>
                  <span className="text-gray-700 dark:text-gray-300">{com.texto}</span>
                </div>
              </div>
            ))}
            {comentarios.length === 0 && <p className="text-xs text-gray-400 text-center italic">Sé el primero en opinar...</p>}
          </div>

          <form onSubmit={handleComentar} className="flex gap-2">
            <input 
              type="text" 
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 px-4 py-2 text-sm border-none bg-white dark:bg-gray-800 dark:text-white rounded-full shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button 
              type="submit" 
              disabled={enviando}
              className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 shadow-md transition-transform active:scale-95"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// --- PÁGINA PRINCIPAL (DashboardPage) ---
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  
  // Estados para Reportes
  const [reporteTexto, setReporteTexto] = useState("");
  const [esAnonimo, setEsAnonimo] = useState(false);
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [mensajeReporte, setMensajeReporte] = useState("");
  
  // Estado para Publicar (Residente)
  const [nuevoPost, setNuevoPost] = useState("");
  const [publicando, setPublicando] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u?.email === "admin@condosocial.app") router.push("/admin");
      else if (u) setUser(u);
      else router.push("/");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      const qAnuncios = query(collection(db, "anuncios"), orderBy("fecha", "desc"));
      const unsubAnuncios = onSnapshot(qAnuncios, (s) => setAnuncios(s.docs.map(d => ({ id: d.id, ...d.data() } as Anuncio))));
      
      const qDocs = query(collection(db, "documentos"), orderBy("fecha", "desc"));
      const unsubDocs = onSnapshot(qDocs, (s) => setDocumentos(s.docs.map(d => ({ id: d.id, ...d.data() } as Documento))));

      return () => { unsubAnuncios(); unsubDocs(); };
    }
  }, [user]);

  const handlePublicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoPost.trim()) return;
    setPublicando(true);
    try {
      await addDoc(collection(db, "anuncios"), {
        contenido: nuevoPost,
        fecha: serverTimestamp(),
        autor: user?.email?.split('@')[0] || "Vecino"
      });
      setNuevoPost("");
    } catch (e) { console.error(e); }
    finally { setPublicando(false); }
  };

  const handleEnviarReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporteTexto.trim()) return;
    setEnviandoReporte(true);
    
    try {
      await addDoc(collection(db, "reportes"), {
        contenido: reporteTexto,
        autor: esAnonimo ? "Anónimo" : user?.email,
        esAnonimo: esAnonimo,
        fecha: serverTimestamp(),
        estado: "Pendiente"
      });
      setMensajeReporte("¡Reporte enviado! El administrador lo revisará.");
      setReporteTexto("");
      setTimeout(() => setMensajeReporte(""), 3000);
    } catch (error) {
      console.error(error);
      setMensajeReporte("Error al enviar.");
    } finally {
      setEnviandoReporte(false);
    }
  };

  const scrollToReporte = () => {
    const element = document.getElementById('formulario-reporte');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      const textarea = element.querySelector('textarea');
      if(textarea) textarea.focus();
    }
  };

  if (!user) return <div className="flex h-screen items-center justify-center dark:bg-gray-900 dark:text-white">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 z-20 shadow-sm backdrop-blur-md bg-opacity-80 dark:bg-opacity-80">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 tracking-tight">
            CondoSocial
          </h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex flex-col text-right hidden sm:block">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Residente</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-white">{user.email}</span>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
              title="Salir"
            >
              🚪
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-8 space-y-8">
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 overflow-hidden">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="avatar" />
              </div>
              <form onSubmit={handlePublicar} className="flex-1">
                <textarea
                  rows={2}
                  value={nuevoPost}
                  onChange={(e) => setNuevoPost(e.target.value)}
                  placeholder="¿Qué quieres compartir con la comunidad? (Ventas, invitaciones...)"
                  className="w-full bg-transparent text-lg text-gray-800 dark:text-white placeholder-gray-400 resize-none outline-none"
                />
                <div className="flex justify-end mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button 
                    disabled={publicando || !nuevoPost.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold text-sm transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                  >
                    {publicando ? "Publicando..." : "Publicar"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            {anuncios.map(anuncio => (
              <AnuncioCard key={anuncio.id} anuncio={anuncio} userEmail={user.email || ""} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
              🧾 Mis Recibos
            </h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {documentos.map(doc => (
                <a 
                  key={doc.id} 
                  href={doc.url} 
                  target="_blank"
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors backdrop-blur-sm border border-white/10"
                >
                  <span className="text-2xl">
                    {doc.fileType?.includes('pdf') ? '📑' : '🖼️'}
                  </span>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate">{doc.nombre}</p>
                    <p className="text-xs text-indigo-200">
                      {doc.fecha?.seconds ? new Date(doc.fecha.seconds * 1000).toLocaleDateString() : ''}
                    </p>
                  </div>
                </a>
              ))}
              {documentos.length === 0 && <p className="text-sm text-indigo-200">Estás al día. No hay recibos nuevos.</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4">Accesos Rápidos</h3>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={scrollToReporte}
                className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors flex items-center justify-center gap-2"
              >
                📢 Ir a Reportar
              </button>
            </div>
          </div>

          <div id="formulario-reporte" className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              🚨 Reportar Incidente
            </h3>
            <form onSubmit={handleEnviarReporte} className="space-y-3">
              <textarea
                rows={3}
                value={reporteTexto}
                onChange={(e) => setReporteTexto(e.target.value)}
                placeholder="Ej: Foco quemado en pasillo 3, Ruidos molestos..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black dark:text-white dark:bg-gray-700 resize-none"
              />
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={esAnonimo}
                    onChange={(e) => setEsAnonimo(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Enviar como Anónimo</span>
                </label>
                <button
                  type="submit"
                  disabled={enviandoReporte || !reporteTexto.trim()}
                  className="bg-gray-900 dark:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-black dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {enviandoReporte ? "..." : "Enviar"}
                </button>
              </div>
              {mensajeReporte && (
                <p className="text-xs text-center text-green-600 font-medium mt-2">{mensajeReporte}</p>
              )}
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}