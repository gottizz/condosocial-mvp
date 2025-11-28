"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, where, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { auth, db } from "../../firebase.config";
import { useTheme } from "../ThemeContext";
import Link from "next/link";

interface Comentario { id: string; texto: string; autor: string; fecha: any; }
interface Anuncio { id: string; contenido: string; autor: string; uid?: string; fecha: any; }
interface Documento { id: string; nombre: string; url: string; fecha: any; fileType?: string; evidencias?: any[]; }
interface Reporte { id: string; contenido: string; estado: string; fecha: any; }
interface Encuesta { id: string; pregunta: string; opcion1: string; opcion2: string; votos1: number; votos2: number; votosUsuarios: string[]; }

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button 
      onClick={toggleTheme}
      className="p-2.5 rounded-full bg-white/10 dark:bg-slate-800 text-yellow-500 dark:text-yellow-300 hover:bg-white/20 transition-all border border-gray-200 dark:border-slate-700 backdrop-blur-sm"
    >
      {isDark ? "🌙" : "☀️"}
    </button>
  );
};

// COMPONENTE ENCUESTA REDISEÑADO
const EncuestaCard = ({ encuesta, userEmail }: { encuesta: Encuesta, userEmail: string }) => {
  const yaVoto = encuesta.votosUsuarios?.includes(userEmail);
  const totalVotos = encuesta.votos1 + encuesta.votos2;
  const p1 = totalVotos > 0 ? Math.round((encuesta.votos1 / totalVotos) * 100) : 0;
  const p2 = totalVotos > 0 ? Math.round((encuesta.votos2 / totalVotos) * 100) : 0;

  const votar = async (opcion: 1 | 2) => {
    if (yaVoto) return;
    try {
      await updateDoc(doc(db, "encuestas", encuesta.id), {
        [`votos${opcion}`]: encuesta[`votos${opcion}`] + 1,
        votosUsuarios: arrayUnion(userEmail)
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 mb-4 relative overflow-hidden backdrop-blur-sm hover:border-indigo-500/30 transition-colors">
      <div className="absolute top-0 right-0 bg-gradient-to-bl from-indigo-500 to-violet-600 text-white text-[10px] px-3 py-1 rounded-bl-xl font-bold shadow-sm">Votación Activa</div>
      <h3 className="font-bold text-gray-800 dark:text-white mb-4 pr-8 text-lg">{encuesta.pregunta}</h3>
      
      {!yaVoto ? (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => votar(1)} className="bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 py-3 rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-slate-700 transition-all border border-indigo-100 dark:border-slate-700 hover:shadow-md active:scale-95">
            {encuesta.opcion1}
          </button>
          <button onClick={() => votar(2)} className="bg-purple-50 dark:bg-slate-800 text-purple-700 dark:text-purple-300 py-3 rounded-xl font-bold hover:bg-purple-100 dark:hover:bg-slate-700 transition-all border border-purple-100 dark:border-slate-700 hover:shadow-md active:scale-95">
            {encuesta.opcion2}
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div>
            <div className="flex justify-between text-xs mb-1.5 text-gray-600 dark:text-gray-400 font-medium">
              <span>{encuesta.opcion1}</span>
              <span className="text-indigo-600 dark:text-indigo-400">{p1}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${p1}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5 text-gray-600 dark:text-gray-400 font-medium">
              <span>{encuesta.opcion2}</span>
              <span className="text-purple-600 dark:text-purple-400">{p2}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
              <div className="bg-purple-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${p2}%` }}></div>
            </div>
          </div>
          <p className="text-center text-xs text-emerald-500 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
            <span>✓</span> Gracias por tu voto
          </p>
        </div>
      )}
    </div>
  );
};

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
    <div className={`rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border 
      ${esAdmin 
        ? 'bg-gradient-to-br from-blue-50 to-indigo-50/50 border-blue-200 dark:from-slate-800 dark:to-slate-900 dark:border-blue-900/50' 
        : 'bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800'}`}>
      
      <div className="flex items-center mb-4">
        <Link href={anuncio.uid ? `/profile/${anuncio.uid}` : '#'} className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-md mr-4 cursor-pointer hover:scale-105 transition-transform border-2 border-white dark:border-slate-700
          ${esAdmin ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white' : 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white'}`}>
          {anuncio.autor[0].toUpperCase()}
        </Link>
        <div>
          {esAdmin ? (
            <div className="flex items-center gap-2">
               <h3 className="font-bold text-lg text-blue-700 dark:text-blue-400">Administración</h3>
               <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-blue-200 dark:border-blue-800">Oficial</span>
            </div>
          ) : (
            <Link href={anuncio.uid ? `/profile/${anuncio.uid}` : '#'} className="font-bold text-lg text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              {anuncio.autor}
            </Link>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
            {anuncio.fecha?.seconds ? new Date(anuncio.fecha.seconds * 1000).toLocaleDateString('es-PE', {weekday: 'short', day: 'numeric', month: 'short'}) : 'Justo ahora'}
          </p>
        </div>
      </div>

      <p className="text-gray-700 dark:text-gray-300 mb-5 whitespace-pre-wrap leading-relaxed text-[15px] pl-1">
        {anuncio.contenido}
      </p>
      
      <div className="border-t border-gray-100 dark:border-slate-800 pt-3 flex justify-end">
        <button 
          onClick={() => setMostrarComentarios(!mostrarComentarios)}
          className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold flex items-center gap-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-1.5 rounded-lg transition-all"
        >
          <span className="text-lg">💬</span> 
          {comentarios.length > 0 ? `${comentarios.length} Comentarios` : "Comentar"}
        </button>
      </div>

      {mostrarComentarios && (
        <div className="mt-4 bg-gray-50 dark:bg-slate-950/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 animate-in slide-in-from-top-2">
          <div className="space-y-3 mb-4 max-h-60 overflow-y-auto scrollbar-thin pr-2">
            {comentarios.map(com => (
              <div key={com.id} className="flex gap-3 group">
                <div className="flex-1 bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm text-sm border border-gray-100 dark:border-slate-700">
                  <span className="font-bold text-gray-900 dark:text-white block text-xs mb-1 opacity-70">{com.autor}</span>
                  <span className="text-gray-700 dark:text-gray-300">{com.texto}</span>
                </div>
              </div>
            ))}
            {comentarios.length === 0 && <p className="text-xs text-gray-400 text-center italic py-2">Sé el primero en opinar...</p>}
          </div>

          <form onSubmit={handleComentar} className="flex gap-2 relative">
            <input 
              type="text" 
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 pl-4 pr-12 py-3 text-sm border-none bg-white dark:bg-slate-800 dark:text-white rounded-full shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            />
            <button 
              type="submit" 
              disabled={enviando}
              className="absolute right-1.5 top-1.5 bg-indigo-600 text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 shadow-md transition-transform active:scale-95"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

const DocumentoCard = ({ doc }: { doc: Documento }) => {
  const [mostrarEvidencias, setMostrarEvidencias] = useState(false);
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 overflow-hidden">
           <div className="bg-white/20 p-2 rounded-lg text-xl">📄</div>
           <div className="min-w-0">
             <a href={doc.url} target="_blank" className="font-bold text-sm text-white hover:underline block truncate">{doc.nombre}</a>
             <span className="text-xs text-indigo-200 block mt-0.5">{doc.fecha?.seconds ? new Date(doc.fecha.seconds * 1000).toLocaleDateString() : ''}</span>
           </div>
        </div>
      </div>
      
      {doc.evidencias && doc.evidencias.length > 0 && (
        <div>
          <button onClick={() => setMostrarEvidencias(!mostrarEvidencias)} className="text-xs text-indigo-200 hover:text-white underline mb-2 flex items-center gap-1">
            {mostrarEvidencias ? "▼ Ocultar" : "▶ Ver"} {doc.evidencias.length} Vouchers
          </button>
          
          {mostrarEvidencias && (
            <div className="grid grid-cols-2 gap-2 mt-1 p-2 bg-black/20 rounded-lg animate-in fade-in">
              {doc.evidencias.map((ev, i) => (
                <a key={i} href={ev.url} target="_blank" className="text-xs bg-white/10 hover:bg-white/20 px-2 py-2 rounded transition-colors flex items-center justify-center gap-1 text-center text-white" title={ev.name}>
                  📸 {ev.name.substring(0, 8)}...
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [misReportes, setMisReportes] = useState<Reporte[]>([]);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  
  const [reporteTexto, setReporteTexto] = useState("");
  const [esAnonimo, setEsAnonimo] = useState(false);
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [mensajeReporte, setMensajeReporte] = useState("");
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
      const qReportes = query(collection(db, "reportes"), where("autor", "==", user.email), orderBy("fecha", "desc"));
      const unsubReportes = onSnapshot(qReportes, (s) => setMisReportes(s.docs.map(d => ({ id: d.id, ...d.data() } as Reporte))));
      const qEncuestas = query(collection(db, "encuestas"), orderBy("fecha", "desc"));
      const unsubEncuestas = onSnapshot(qEncuestas, (s) => setEncuestas(s.docs.map(d => ({ id: d.id, ...d.data() } as Encuesta))));
      return () => { unsubAnuncios(); unsubDocs(); unsubReportes(); unsubEncuestas(); };
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
        autor: user?.displayName || user?.email?.split('@')[0] || "Vecino",
        uid: user?.uid
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
        estado: "Pendiente",
        fecha: serverTimestamp()
      });
      setMensajeReporte("¡Reporte enviado!");
      setReporteTexto("");
      setTimeout(() => setMensajeReporte(""), 3000);
    } catch (error) {
      setMensajeReporte("Error al enviar.");
    } finally {
      setEnviandoReporte(false);
    }
  };

  const scrollToReporte = () => {
    const element = document.getElementById('formulario-reporte');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      element.querySelector('textarea')?.focus();
    }
  };

  if (!user) return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-950 dark:text-white">Cargando...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* NAVBAR PREMIUM */}
      <nav className="bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-30 shadow-sm backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/30">C</div>
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight hidden sm:block">
              CondoSocial
             </h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <ThemeToggle />
            
            <Link href={`/profile/${user.uid}`} className="group flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-800 px-3 py-1.5 rounded-full transition-all cursor-pointer">
               <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Residente</p>
                 <p className="text-sm font-bold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.email?.split('@')[0]}</p>
               </div>
               <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 p-0.5 shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all">
                 <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center">
                    <span className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-violet-600">
                      {user.email?.[0].toUpperCase()}
                    </span>
                 </div>
               </div>
            </Link>

            <button onClick={() => signOut(auth)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Salir">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
        
        {/* COLUMNA IZQUIERDA (8/12): MURO */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Caja de Publicar Estilizada */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-pink-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex gap-4">
              <div className="w-11 h-11 rounded-full bg-gray-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden border border-gray-200 dark:border-slate-700">
                 <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{user.email?.[0].toUpperCase()}</div>
              </div>
              <form onSubmit={handlePublicar} className="flex-1">
                <textarea 
                  rows={2} 
                  value={nuevoPost} 
                  onChange={(e) => setNuevoPost(e.target.value)} 
                  placeholder="¿Qué quieres compartir con la comunidad hoy?" 
                  className="w-full bg-transparent text-lg text-gray-800 dark:text-white placeholder-gray-400 resize-none outline-none min-h-[80px]" 
                />
                <div className="flex justify-between items-center mt-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                  <div className="text-xs text-gray-400 flex gap-3">
                    <span className="hover:text-blue-500 cursor-pointer transition-colors">📷 Foto</span>
                    <span className="hover:text-blue-500 cursor-pointer transition-colors">📍 Ubicación</span>
                  </div>
                  <button 
                    disabled={publicando || !nuevoPost.trim()} 
                    className="bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-black px-6 py-2 rounded-full font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-lg shadow-gray-200 dark:shadow-none"
                  >
                    {publicando ? "Publicando..." : "Publicar"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Feed de Anuncios */}
          <div className="space-y-6 pb-20">
            {anuncios.map(anuncio => (<AnuncioCard key={anuncio.id} anuncio={anuncio} userEmail={user.email || ""} />))}
          </div>
        </div>

        {/* COLUMNA DERECHA (4/12): SIDEBAR */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* VOTACIONES (SI HAY) */}
          {encuestas.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <h3 className="font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wide">Votaciones Activas</h3>
                 <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </div>
              {encuestas.map(enc => <EncuestaCard key={enc.id} encuesta={enc} userEmail={user.email || ""} />)}
            </div>
          )}

          {/* RECIBOS PREMIUM */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 dark:shadow-none relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-black/10 rounded-full blur-2xl"></div>
            
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2 relative z-10">
              🧾 Recibos del Mes
            </h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
              {documentos.map(doc => <DocumentoCard key={doc.id} doc={doc} />)}
              {documentos.length === 0 && <p className="text-sm text-indigo-200 italic">Todo al día. ✨</p>}
            </div>
          </div>

          {/* ACCESOS RÁPIDOS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-sm uppercase tracking-wide">Atajos</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={scrollToReporte} className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors flex flex-col items-center justify-center gap-2 h-20">
                <span className="text-xl">🚨</span>
                Reportar
              </button>
              <Link href="/vecinos" className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex flex-col items-center justify-center gap-2 h-20">
                <span className="text-xl">👥</span>
                Vecinos
              </Link>
            </div>
          </div>

          {/* MIS REPORTES */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-sm uppercase tracking-wide flex justify-between items-center">
              Mis Reportes
              <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs">{misReportes.length}</span>
            </h3>
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
              {misReportes.map(rep => (
                <div key={rep.id} className="p-3 border border-gray-100 dark:border-slate-700 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">{rep.fecha?.seconds ? new Date(rep.fecha.seconds * 1000).toLocaleDateString() : 'Hoy'}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm
                      ${!rep.estado || rep.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 
                        rep.estado === 'Visto' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                      {rep.estado || 'Pendiente'}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium leading-snug line-clamp-2">{rep.contenido}</p>
                </div>
              ))}
              {misReportes.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No tienes reportes activos.</p>}
            </div>
          </div>

          {/* FORMULARIO DE REPORTE (ID para scroll) */}
          <div id="formulario-reporte" className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 rounded-l-2xl"></div>
            <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-rose-500">🚨</span> Nuevo Reporte
            </h3>
            <form onSubmit={handleEnviarReporte} className="space-y-4">
              <textarea 
                rows={3} 
                value={reporteTexto} 
                onChange={(e) => setReporteTexto(e.target.value)} 
                placeholder="Describe el problema (ej: Foco quemado piso 3)..." 
                className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-gray-50 dark:bg-slate-950 dark:text-white resize-none transition-all" 
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input type="checkbox" checked={esAnonimo} onChange={(e) => setEsAnonimo(e.target.checked)} className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 border-gray-300" />
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 group-hover:text-rose-600 transition-colors">Enviar Anónimo</span>
                </label>
                <button type="submit" disabled={enviandoReporte || !reporteTexto.trim()} className="bg-rose-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-md shadow-rose-200 dark:shadow-none">
                  {enviandoReporte ? "..." : "Enviar Reporte"}
                </button>
              </div>
              {mensajeReporte && <p className="text-xs text-center text-emerald-600 font-bold mt-2 bg-emerald-50 dark:bg-emerald-900/20 py-1 rounded">{mensajeReporte}</p>}
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}