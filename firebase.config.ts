// Importa las funciones que necesitas
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// 1. Pega tu "firebaseConfig" aquí (el que copiaste de Firebase)
// Asegúrate de que sea el tuyo y no este de ejemplo
const firebaseConfig = {
  apiKey: "AIzaSyB1gTNOo00YLznxIdcrZuXJpZrqSc8CXzI",
  authDomain: "condosocial-mvp.firebaseapp.com",
  projectId: "condosocial-mvp",
  storageBucket: "condosocial-mvp.firebasestorage.app",
  messagingSenderId: "456117494836",
  appId: "1:456117494836:web:4e173a49c2be78956a9661",
  measurementId: "G-6G3CN966D6"
};


// 2. Inicializa la app de Firebase
const app = initializeApp(firebaseConfig);

// 3. Exporta las herramientas que usarás en tu app
// Estas son las "llaves" que usarás en tus páginas
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Exporta la app (opcional, pero buena práctica)
export default app;