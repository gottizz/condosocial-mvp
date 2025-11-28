"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../../firebase.config";
import { useTheme } from "../ThemeContext";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { jsPDF } from "jspdf";

// --- TU API KEY ---
const API_KEY = "AIzaSyDrLvlwzOBQqXEi7LtdkEViXGbW7M8cpdo"; 

interface Comentario { id: string; texto: string; autor: string; fecha: any; }
interface Anuncio { id: string; contenido: string; autor: string; fecha: any; }
interface Reporte { id: string; contenido: string; autor: string; esAnonimo: boolean; fecha: any; estado: string; }
interface Encuesta { id: string; pregunta: string; opcion1: string; opcion2: string; votos1: number; votos2: number; fecha: any; estado: string; }

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
    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 mb-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between mb-3 items-center">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
             A
           </div>
           <div>
             <span className="font-bold text-gray-900 dark:text-white block">Administración</span>
             <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
               {anuncio.fecha?.seconds ? new Date(anuncio.fecha.seconds * 1000).toLocaleDateString() : 'Ahora'}
             </span>
           </div>
        </div>
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm whitespace-pre-wrap leading-relaxed pl-13">
        {anuncio.contenido}
      </p>
      
      <div className="border-t border-gray-100 dark:border-slate-800 pt-3 flex justify-end">
        <button 
          onClick={() => setMostrar(!mostrar)} 
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors"
        >
          {mostrar ? "Ocultar" : `💬 Ver Comentarios (${comentarios.length})`}
        </button>
      </div>

      {mostrar && (
        <div className="mt-3 pl-4 border-l-2 border-indigo-100 dark:border-indigo-900 space-y-3 bg-gray-50 dark:bg-slate-950/50 p-3 rounded-r-xl">
          {comentarios.map(com => (
            <div key={com.id} className="text-xs">
              <span className="font-bold text-gray-900 dark:text-white mr-2">{com.autor}:</span>
              <span className="text-gray-600 dark:text-gray-400">{com.texto}</span>
            </div>
          ))}
          {comentarios.length === 0 && <p className="text-xs text-gray-400 italic">Nadie ha comentado aún.</p>}
        </div>
      )}
    </div>
  );
};

const EncuestaResultCard = ({ encuesta }: { encuesta: Encuesta }) => {
  const total = encuesta.votos1 + encuesta.votos2;
  const p1 = total > 0 ? Math.round((encuesta.votos1 / total) * 100) : 0;
  const p2 = total > 0 ? Math.round((encuesta.votos2 / total) * 100) : 0;

  const cerrarEncuesta = async () => {
    if (confirm("¿Terminar votación?")) {
       await updateDoc(doc(db, "encuestas", encuesta.id), { estado: "Cerrada" });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 mb-3 text-sm shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold text-gray-800 dark:text-white text-sm pr-4">{encuesta.pregunta}</h4>
        {encuesta.estado !== "Cerrada" ? (
             <button onClick={cerrarEncuesta} className="text-[10px] bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors font-bold whitespace-nowrap">Terminar</button>
        ) : (
             <span className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-500 px-2 py-1 rounded-lg whitespace-nowrap">Cerrada</span>
        )}
      </div>
      
      <div className="space-y-3">
        <div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>{encuesta.opcion1}</span> <span className="font-bold">{p1}% ({encuesta.votos1})</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{width: `${p1}%`}}></div>
            </div>
        </div>
        <div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>{encuesta.opcion2}</span> <span className="font-bold">{p2}% ({encuesta.votos2})</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{width: `${p2}%`}}></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados
  const [nuevoAnuncio, setNuevoAnuncio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // IA
  const [files, setFiles] = useState<FileList | null>(null);
  const [reporteNombre, setReporteNombre] = useState("");
  const [procesandoIA, setProcesandoIA] = useState(false);
  
  // Manual
  const [file, setFile] = useState<File | null>(null);
  const [docNombre, setDocNombre] = useState("");
  const [uploading, setUploading] = useState(false);

  // Encuesta
  const [pregunta, setPregunta] = useState("");
  const [opcion1, setOpcion1] = useState("");
  const [opcion2, setOpcion2] = useState("");
  const [creandoEncuesta, setCreandoEncuesta] = useState(false);
  
  // Data
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u?.email === "admin@condosocial.app") {
        setUser(u);
      } else {
        router.push("/");
      }
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
      
      const qEncuestas = query(collection(db, "encuestas"), orderBy("fecha", "desc"));
      const unsubEncuestas = onSnapshot(qEncuestas, (s) => setEncuestas(s.docs.map(d => ({ id: d.id, ...d.data() } as Encuesta))));

      return () => { unsubAnuncios(); unsubReportes(); unsubEncuestas(); };
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

  const handleCrearEncuesta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pregunta || !opcion1 || !opcion2) return;
    setCreandoEncuesta(true);
    try {
      await addDoc(collection(db, "encuestas"), {
        pregunta,
        opcion1,
        opcion2,
        votos1: 0,
        votos2: 0,
        votosUsuarios: [],
        fecha: serverTimestamp(),
        estado: "Activa"
      });
      setPregunta(""); setOpcion1(""); setOpcion2("");
      alert("Encuesta lanzada!");
    } catch (e) { console.error(e); }
    finally { setCreandoEncuesta(false); }
  };

  const fileToGenerativePart = async (file: File) => {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });
    return { inlineData: { data: await base64EncodedDataPromise, mimeType: file.type } };
  };

  const handleGenerarReporteIA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files || files.length === 0 || !reporteNombre) return;
    setProcesandoIA(true);
    try {
      const genAI = new GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      const imageParts = await Promise.all(Array.from(files).map(fileToGenerativePart));
      
      const prompt = `Analiza estos recibos. Regla: Devuelve SOLO una línea por recibo: EMPRESA | FECHA | MONTO. Ejemplo: Hidrandina | 12/11/2025 | 45.50. Si falta fecha usa "Hoy". Si falta monto usa "0".`;
      const result = await model.generateContent([prompt, ...imageParts]);
      const responseText = await result.response.text();
      
      const lineas = responseText.trim().split('\n').filter(line => line.includes('|'));
      if (lineas.length === 0) throw new Error("Sin datos.");
      
      const datosGastos = lineas.map(line => {
        const partes = line.split('|');
        const montoLimpio = partes[2]?.replace(/[^0-9.]/g, '') || "0";
        return { concepto: partes[0]?.trim(), fecha: partes[1]?.trim(), monto: parseFloat(montoLimpio) };
      });

      // PDF
      const doc = new jsPDF();
      let yPos = 20;
      doc.setFillColor(30, 58, 138); doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(24); doc.setFont("helvetica", "bold"); doc.text("CondoSocial", 20, 20);
      doc.setFontSize(12); doc.setFont("helvetica", "normal"); doc.text("Reporte Automatizado", 20, 30);
      doc.setTextColor(50, 50, 50); doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.text(reporteNombre.toUpperCase(), 20, 60);
      yPos = 85;
      doc.setFillColor(240, 240, 240); doc.rect(20, yPos - 8, 170, 12, 'F');
      doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont("helvetica", "bold");
      doc.text("CONCEPTO", 25, yPos); doc.text("FECHA", 110, yPos); doc.text("MONTO (S/)", 160, yPos);
      yPos += 15;
      doc.setFont("helvetica", "normal");
      let totalCalculado = 0;
      datosGastos.forEach((gasto, index) => {
        if (index % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(20, yPos - 6, 170, 10, 'F'); }
        doc.text(String(gasto.concepto).substring(0, 35), 25, yPos);
        doc.text(String(gasto.fecha), 110, yPos);
        doc.text(gasto.monto.toFixed(2), 160, yPos);
        totalCalculado += gasto.monto;
        yPos += 12;
      });
      yPos += 5; doc.setDrawColor(200, 200, 200); doc.line(20, yPos, 190, yPos); yPos += 15;
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("TOTAL:", 100, yPos);
      doc.setTextColor(220, 20, 60); doc.setFontSize(16); doc.text(`S/ ${totalCalculado.toFixed(2)}`, 160, yPos);
      doc.setFontSize(9); doc.setTextColor(150); doc.text("Generado con IA", 105, 280, { align: "center" });

      const pdfBlob = doc.output('blob');
      const pdfFile = new File([pdfBlob], `${reporteNombre}.pdf`, { type: "application/pdf" });
      const storageRef = ref(storage, `gastos/${Date.now()}_${reporteNombre}.pdf`);
      const task = uploadBytesResumable(storageRef, pdfFile);

      task.on('state_changed', null, console.error, async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        const evidenciasSubidas = await Promise.all(Array.from(files).map(async f => {
           const refImg = ref(storage, `gastos/ev_${Date.now()}_${f.name}`);
           await uploadBytesResumable(refImg, f);
           return { name: f.name, url: await getDownloadURL(refImg), type: f.type };
        }));
        
        await addDoc(collection(db, "documentos"), {
          nombre: reporteNombre + ` (Total: S/ ${totalCalculado.toFixed(2)})`,
          url: url, fecha: serverTimestamp(), fileType: "application/pdf", evidencias: evidenciasSubidas
        });
        setFiles(null); setReporteNombre(""); setProcesandoIA(false); alert("¡Reporte Creado!");
        const fileInput = document.getElementById('file-input-ia') as HTMLInputElement;
        if(fileInput) fileInput.value = "";
      });
    } catch (e) { console.error(e); alert("Error IA"); setProcesandoIA(false); }
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
        await addDoc(collection(db, "documentos"), { nombre: docNombre, url, fecha: serverTimestamp(), fileType: file.type });
        setFile(null); setDocNombre(""); setUploading(false); alert("¡Subido!");
      });
    } catch (e) { console.error(e); setUploading(false); }
  };

  const cambiarEstado = async (id: string, nuevoEstado: string) => {
    try { await updateDoc(doc(db, "reportes", id), { estado: nuevoEstado }); } 
    catch (e) { console.error(e); }
  };

  if (loading || !user) return <div className="flex h-screen items-center justify-center bg-slate-950 text-white">Cargando panel...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <nav className="bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-30 shadow-sm backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">A</div>
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-400 tracking-tight">
              Panel Admin
             </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Usuario</p>
              <p className="text-sm font-bold text-gray-800 dark:text-white">{user.email}</p>
            </div>
            <button onClick={() => signOut(auth)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors" title="Salir">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 pt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-6">
            
            {/* 🗳️ CREAR VOTACIÓN */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2">🗳️ Crear Votación</h2>
              <form onSubmit={handleCrearEncuesta} className="space-y-3">
                <input value={pregunta} onChange={e => setPregunta(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-950 text-black dark:text-white text-sm outline-none" placeholder="Pregunta" />
                <div className="flex gap-2">
                   <input value={opcion1} onChange={e => setOpcion1(e.target.value)} className="w-1/2 p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-950 text-black dark:text-white text-sm" placeholder="Opción 1" />
                   <input value={opcion2} onChange={e => setOpcion2(e.target.value)} className="w-1/2 p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-950 text-black dark:text-white text-sm" placeholder="Opción 2" />
                </div>
                <button disabled={creandoEncuesta} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors">{creandoEncuesta ? "Creando..." : "Lanzar"}</button>
              </form>
            </div>

            {/* 🤖 Auditoría IA */}
            <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-1 rounded-2xl shadow-xl shadow-purple-500/20">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl h-full text-white border border-white/10">
                <h2 className="font-bold text-lg mb-2 flex items-center gap-2">🤖 Auditoría IA</h2>
                <form onSubmit={handleGenerarReporteIA} className="space-y-3">
                  <input type="text" value={reporteNombre} onChange={e => setReporteNombre(e.target.value)} placeholder="Título" className="w-full p-3 border border-white/20 rounded-xl bg-black/20 text-white text-sm placeholder-white/50 focus:ring-2 focus:ring-white/50 outline-none" />
                  <div className="relative">
                    <input id="file-input-ia" type="file" multiple onChange={e => setFiles(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.jpg,.png,.jpeg" />
                    <div className="w-full p-3 border border-dashed border-white/30 rounded-xl bg-white/5 text-center hover:bg-white/10 transition-colors flex flex-col items-center justify-center gap-1">
                        <span className="text-xl">📸</span>
                        <span className="text-xs font-medium text-purple-100">{files && files.length > 0 ? `${files.length} archivos` : "Subir fotos"}</span>
                    </div>
                  </div>
                  <button disabled={procesandoIA || !files || !reporteNombre} className="w-full bg-white text-purple-700 py-3 rounded-xl font-bold text-sm hover:bg-purple-50 disabled:opacity-50 transition-all shadow-lg">
                    {procesandoIA ? "Procesando..." : "✨ Generar Pack"}
                  </button>
                </form>
              </div>
            </div>

            {/* 📢 PUBLICAR */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4">📢 Publicar</h2>
              <form onSubmit={handlePublicar} className="space-y-3">
                <textarea value={nuevoAnuncio} onChange={e => setNuevoAnuncio(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-950 text-black dark:text-white text-sm outline-none resize-none" placeholder="Anuncio..." rows={3} />
                <button disabled={isSubmitting} className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">{isSubmitting ? "..." : "Publicar"}</button>
              </form>
            </div>

            {/* 🧾 MANUAL */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
              <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4">🧾 Subir Manual</h2>
              <form onSubmit={handleUpload} className="space-y-3">
                <input type="text" value={docNombre} onChange={e => setDocNombre(e.target.value)} placeholder="Nombre" className="w-full p-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-950 text-black dark:text-white text-sm outline-none" />
                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="text-sm text-gray-500 w-full" accept=".pdf,.jpg,.png" />
                <button disabled={uploading} className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50 transition-colors">{uploading ? "Subiendo..." : "Subir"}</button>
              </form>
            </div>
          </div>

          {/* COLUMNA 2: VISTA DEL MURO */}
          <div className="bg-gray-50 dark:bg-slate-950/50 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 h-full overflow-y-auto max-h-[900px] custom-scrollbar">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-gray-50 dark:bg-[#0b1121] py-2 z-10">
               <h2 className="font-bold text-lg text-gray-800 dark:text-white">Vista del Muro</h2>
               <span className="text-xs bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md font-mono">Live</span>
            </div>
            <div className="space-y-4 pb-10">{anuncios.map(anuncio => (<AnuncioCard key={anuncio.id} anuncio={anuncio} />))}</div>
          </div>

          {/* COLUMNA 3: RESULTADOS Y REPORTES */}
          <div className="space-y-6">
            
            {/* 📊 RESULTADOS ENCUESTAS */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
                <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4">📊 Resultados Votaciones</h2>
                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {encuestas.length > 0 ? (
                        encuestas.map(enc => <EncuestaResultCard key={enc.id} encuesta={enc} />)
                    ) : (
                        <p className="text-xs text-gray-400 text-center">No hay votaciones activas.</p>
                    )}
                </div>
            </div>

            {/* 🚨 BUZÓN DE REPORTES */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 h-full flex flex-col max-h-[500px]">
                <h2 className="font-bold text-lg text-gray-800 dark:text-white mb-4 flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-900 py-2 z-10">
                    🚨 Buzón <span className="bg-rose-100 text-rose-600 text-xs px-2 py-1 rounded-full">{reportes.length}</span>
                </h2>
                <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {reportes.map(reporte => (
                    <div key={reporte.id} className="p-4 border border-gray-100 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${reporte.esAnonimo ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>{reporte.esAnonimo ? '🕵️ Anónimo' : reporte.autor.split('@')[0]}</span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${!reporte.estado || reporte.estado === 'Pendiente' ? 'bg-amber-50 text-amber-600' : reporte.estado === 'Visto' ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'}`}>{reporte.estado || "Pendiente"}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 font-medium">"{reporte.contenido}"</p>
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                        <button onClick={() => cambiarEstado(reporte.id, "Visto")} className="text-xs py-1.5 bg-sky-50 text-sky-600 rounded-lg font-bold hover:bg-sky-100">👀 Visto</button>
                        <button onClick={() => cambiarEstado(reporte.id, "Solucionado")} className="text-xs py-1.5 bg-emerald-50 text-emerald-600 rounded-lg font-bold hover:bg-emerald-100">✅ Listo</button>
                    </div>
                    </div>
                ))}
                </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}