import { db, secondaryAuth, CORREO_ADMIN } from './config.js';
import { 
    collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- GESTIÓN DE ALUMNOS ---
export function activarSincronizacionAlumnos() {
    onSnapshot(collection(db, "usuarios"), (snap) => {
        const t = document.getElementById('cuerpo-tabla');
        if (!t) return;
        t.innerHTML = "";
        snap.forEach(d => {
            const u = d.data();
            if(u.email === CORREO_ADMIN) return;
            t.innerHTML += `<tr><td>${u.email}</td><td><b>${u.curso}</b></td><td>
                <button class="btn-accion btn-edit" onclick="editarAlumno('${d.id}','${u.curso}')">E</button>
                <button class="btn-accion btn-borrar" onclick="borrarAlumno('${d.id}')">X</button>
            </td></tr>`;
        });
    });
}

window.editarAlumno = async (id, c) => {
    const n = prompt("Nuevo curso:", c);
    if(n) await updateDoc(doc(db, "usuarios", id), { curso: n });
};

window.borrarAlumno = async (id) => {
    if(confirm("¿Borrar alumno?")) await deleteDoc(doc(db, "usuarios", id));
};

export async function crearAlumnoManual(email, pass, curso) {
    try {
        try {
            await createUserWithEmailAndPassword(secondaryAuth, email, pass);
            await signOut(secondaryAuth); 
        } catch (authErr) {
            if (authErr.code !== 'auth/email-already-in-use') throw authErr;
        }
        await setDoc(doc(db, "usuarios", email), { email, curso, rol: "alumno" });
        return { success: true };
    } catch (e) {
        throw e;
    }
}

// --- GESTIÓN DE CUESTIONARIOS ---
export function activarSincronizacionQuizzes() {
    onSnapshot(collection(db, "cuestionarios"), (snap) => {
        const tabla = document.getElementById('tabla-quizzes');
        if (!tabla) return;
        tabla.innerHTML = "";
        snap.forEach(docSnap => {
            const q = docSnap.data();
            const id = docSnap.id;
            tabla.innerHTML += `
                <tr>
                    <td>${q.titulo}</td>
                    <td><b>${q.curso}</b></td>
                    <td>${q.activo ? '✅' : '❌'}</td>
                    <td>
                        <button class="btn-accion btn-edit" onclick="alternarEstadoQuiz('${id}', ${q.activo})">On/Off</button>
                        <button class="btn-accion btn-borrar" onclick="borrarQuiz('${id}')">X</button>
                    </td>
                </tr>`;
        });
    });
}

window.alternarEstadoQuiz = async (id, estado) => {
    await updateDoc(doc(db, "cuestionarios", id), { activo: !estado });
};

window.borrarQuiz = async (id) => {
    if(confirm("¿Eliminar cuestionario?")) await deleteDoc(doc(db, "cuestionarios", id));
};

export async function guardarNuevoQuiz(datos) {
    return await addDoc(collection(db, "cuestionarios"), {
        ...datos,
        fechaCreacion: new Date().toISOString()
    });
}
