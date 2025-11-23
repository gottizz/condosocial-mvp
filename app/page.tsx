"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signInWithEmailAndPassword, User } from "firebase/auth";
import { auth } from "../firebase.config";
import Link from "next/link"; // Importamos Link

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        if (user.email === "admin@condosocial.app") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, ingresa tu correo y contraseña.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error(err.message);
      if (err.code === 'auth/invalid-credential') {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError("Ocurrió un error. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 transition-colors">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        
        <div className="text-center">
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600 tracking-tight mb-2">
            CondoSocial
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Tu comunidad conectada</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ej: victor@test.com"
              className="w-full px-4 py-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              required
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <p className="text-sm text-center text-red-600 dark:text-red-400 font-bold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-lg font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all"
          >
            {loading ? "Entrando..." : "Ingresar"}
          </button>
        </form>
        
        {/* SECCIÓN DE REGISTRO */}
        <div className="text-center pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ¿Eres nuevo en el edificio?
          </p>
          <Link 
            href="/signup" 
            className="inline-block mt-2 text-blue-600 dark:text-blue-400 font-bold hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
          >
            Crea tu cuenta de vecino aquí →
          </Link>
        </div>

        {/* Info de prueba */}
        <div className="mt-6 p-4 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-700">
          <p className="font-bold mb-1">Cuentas Demo:</p>
          <p>Admin: admin@condosocial.app</p>
          <p>Vecino: victor@test.com</p>
        </div>

      </div>
    </div>
  );
}