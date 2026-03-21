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
    if(confirm("¿Eliminar alumno?")) await deleteDoc(doc(db, "usuarios", id));
};

export async function crearAlumnoManual(email, pass, curso) {
    try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
        await signOut(secondaryAuth);
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

// NUEVA VERSIÓN: Gestiona la ruta y devuelve éxito para limpiar el formulario
export async function guardarNuevoQuiz(datos) {
    try {
        // Si el usuario no puso el prefijo, lo añadimos aquí
        let rutaFinal = datos.ruta.trim();
        if (!rutaFinal.startsWith('cuestionarios/')) {
            rutaFinal = `cuestionarios/${rutaFinal}`;
        }

        const nuevoDoc = {
            titulo: datos.titulo,
            curso: datos.curso,
            ruta: rutaFinal,
            activo: datos.activo
        };

        await addDoc(collection(db, "cuestionarios"), nuevoDoc);
        return true; 
    } catch (e) {
        console.error("Error en guardarNuevoQuiz:", e);
        throw e;
    }
}

let quizEnEdicion = [];

// Función para renderizar el editor
function renderizarEditor() {
    const contenedor = document.getElementById('lista-preguntas-editor');
    contenedor.innerHTML = "";

    quizEnEdicion.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "pregunta-edit";
        div.innerHTML = `
            <button class="btn-delete-preg" onclick="borrarPreguntaEditor(${index})">Eliminar</button>
            <label><b>Pregunta ${index + 1}:</b></label>
            <input type="text" value="${item.pregunta}" onchange="actualizarDato(${index}, 'pregunta', this.value)">
            
            <label>Opciones (marca la correcta):</label>
            ${item.opciones.map((opt, i) => `
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 5px;">
                    <input type="radio" name="correcta-${index}" ${item.respuestaCorrecta === i ? 'checked' : ''} onchange="actualizarDato(${index}, 'respuestaCorrecta', ${i})">
                    <input type="text" value="${opt}" onchange="actualizarOpcion(${index}, ${i}, this.value)">
                </div>
            `).join('')}
            
            <label>Explicación:</label>
            <textarea style="width: 100%;" onchange="actualizarDato(${index}, 'explicacion', this.value)">${item.explicacion || ''}</textarea>
        `;
        contenedor.appendChild(div);
    });
}

// Funciones globales para el editor
window.actualizarDato = (i, campo, valor) => { quizEnEdicion[i][campo] = valor; };
window.actualizarOpcion = (pIndex, oIndex, valor) => { quizEnEdicion[pIndex].opciones[oIndex] = valor; };
window.nuevaPregunta = () => {
    quizEnEdicion.push({ pregunta: "", opciones: ["", "", "", ""], respuestaCorrecta: 0, explicacion: "" });
    renderizarEditor();
};
window.borrarPreguntaEditor = (i) => { quizEnEdicion.splice(i, 1); renderizarEditor(); };

window.descargarJSON = () => {
    const blob = new Blob([JSON.stringify(quizEnEdicion, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "nuevo_cuestionario.json";
    a.click();
};

// Escuchador para importar archivos
document.addEventListener('change', e => {
    if (e.target.id === 'importar-json') {
        const reader = new FileReader();
        reader.onload = (event) => {
            quizEnEdicion = JSON.parse(event.target.result);
            renderizarEditor();
        };
        reader.readAsText(e.target.files[0]);
    }
});
