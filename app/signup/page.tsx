"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase.config";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Datos del formulario
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [torre, setTorre] = useState("");
  const [depto, setDepto] = useState("");
  const [telefono, setTelefono] = useState("");

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Crear el usuario en Firebase Authentication (Login)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Ponerle nombre al usuario interno de Firebase
      await updateProfile(user, { displayName: nombre });

      // 3. GUARDAR EL PERFIL DE VECINO EN LA BASE DE DATOS
      // Creamos una colección nueva "usuarios"
      await setDoc(doc(db, "usuarios", user.uid), {
        uid: user.uid,
        nombre: nombre,
        email: email,
        torre: torre,
        depto: depto,
        telefono: telefono,
        rol: "residente", // Por defecto todos son residentes
        fechaRegistro: serverTimestamp(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}` // Avatar automático
      });

      // 4. ¡Éxito! Mandarlo al Dashboard
      router.push("/dashboard");

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Este correo ya está registrado.");
      } else if (err.code === 'auth/weak-password') {
        setError("La contraseña es muy corta (mínimo 6).");
      } else {
        setError("Error al registrarse. Verifica tus datos.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 transition-colors">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        
        <div className="text-center">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Únete a CondoSocial
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Crea tu perfil de vecino para participar
          </p>
        </div>
        
        <form onSubmit={handleRegistro} className="space-y-4">
          
          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Nombre Completo</label>
            <input
              type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Ej: Victor Bardales"
            />
          </div>

          {/* Ubicación (Fila doble) */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Torre / Bloque</label>
              <input
                type="text" required value={torre} onChange={(e) => setTorre(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej: A"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Departamento</label>
              <input
                type="text" required value={depto} onChange={(e) => setDepto(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ej: 501"
              />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Celular / WhatsApp</label>
            <input
              type="tel" required value={telefono} onChange={(e) => setTelefono(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ej: 999 888 777"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Correo Electrónico</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="tucorreo@ejemplo.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Contraseña</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center font-bold bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creando perfil..." : "Registrarme"}
          </button>
        </form>

        <div className="text-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Ya tienes cuenta?{" "}
            <Link href="/" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
              Inicia Sesión aquí
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}