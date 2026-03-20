import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot, deleteDoc, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBpMD8ezkxeG7qeJHTAgSuXmyX1ma7M7Ng",
    authDomain: "quizs-evo.firebaseapp.com",
    projectId: "quizs-evo",
    storageBucket: "quizs-evo.firebasestorage.app",
    messagingSenderId: "424341251554",
    appId: "1:424341251554:web:84bf886ea4dc965cba45bb"
};

// App Principal (Tu sesión)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// App Secundaria (Solo para crear alumnos sin cerrar tu sesión)
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

const CORREO_ADMIN = "sherlockes@gmail.com";
