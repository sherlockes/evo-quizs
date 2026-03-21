import { db, secondaryAuth, CORREO_ADMIN } from './config.js';
import { 
    collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- VARIABLES DEL EDITOR ---
let quizEnEdicion = [];

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
        await createUserWithEmailAndPassword(secondaryAuth, email, pass);
        await signOut(secondaryAuth);
        await setDoc(doc(db, "usuarios", email), { email, curso, rol: "alumno" });
        return true;
    } catch (e) { throw e; }
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
    try {
        let rutaFinal = datos.ruta.trim();
        if (!rutaFinal.startsWith('cuestionarios/')) {
            rutaFinal = `cuestionarios/${rutaFinal}`;
        }
        await addDoc(collection(db, "cuestionarios"), {
            titulo: datos.titulo,
            curso: datos.curso,
            ruta: rutaFinal,
            activo: datos.activo
        });
        return true;
    } catch (e) { throw e; }
}

// --- LÓGICA DEL EDITOR JSON ---
export function renderizarEditor() {
    const contenedor = document.getElementById('lista-preguntas-editor');
    if (!contenedor) return;
    contenedor.innerHTML = "";

    if (quizEnEdicion.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Cuestionario vacío. Añade una pregunta para empezar.</p>';
        return;
    }

    quizEnEdicion.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "pregunta-edit";
        div.id = `pregunta-id-${index}`; // ID para el scroll automático
        
        div.innerHTML = `
            <div class="editor-header-fila">
                <span class="editor-num">#${index + 1}</span>
                <input type="text" class="editor-enunciado-input" placeholder="Escribe el enunciado de la pregunta..." value="${item.pregunta}" onchange="actualizarDato(${index}, 'pregunta', this.value)">
                <button class="btn-borrar-compact" onclick="borrarPreguntaEditor(${index})" title="Eliminar pregunta">✕</button>
            </div>
            
            <div class="editor-opciones-container">
                ${item.opciones.map((opt, i) => `
                    <div class="opcion-fila">
                        <input type="radio" name="correcta-${index}" ${item.respuestaCorrecta === i ? 'checked' : ''} onchange="actualizarDato(${index}, 'respuestaCorrecta', ${i})" title="Marcar como correcta">
                        <input type="text" placeholder="Opción ${i+1}" value="${opt}" onchange="actualizarOpcion(${index}, ${i}, this.value)">
                    </div>
                `).join('')}
            </div>
            
            <div style="padding-left: 40px;">
                <textarea placeholder="Explicación pedagógica (opcional)..." onchange="actualizarDato(${index}, 'explicacion', this.value)">${item.explicacion || ''}</textarea>
            </div>
        `;
        contenedor.appendChild(div);
    });
}
window.actualizarDato = (i, campo, valor) => { quizEnEdicion[i][campo] = valor; };
window.actualizarOpcion = (pIndex, oIndex, valor) => { quizEnEdicion[pIndex].opciones[oIndex] = valor; };

window.nuevaPregunta = () => {
    quizEnEdicion.push({ pregunta: "", opciones: ["", "", "", ""], respuestaCorrecta: 0, explicacion: "" });
    renderizarEditor();

    // SCROLL AUTOMÁTICO:
    // Esperamos un momento a que el navegador dibuje la nueva pregunta
    setTimeout(() => {
        const ultimaPregunta = document.getElementById(`pregunta-id-${quizEnEdicion.length - 1}`);
        if (ultimaPregunta) {
            ultimaPregunta.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Ponemos el foco en el input de la nueva pregunta para empezar a escribir ya
            ultimaPregunta.querySelector('input[type="text"]').focus();
        }
    }, 100);
};

window.borrarPreguntaEditor = (i) => {
    quizEnEdicion.splice(i, 1);
    renderizarEditor();
};

window.descargarJSON = () => {
    const blob = new Blob([JSON.stringify(quizEnEdicion, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "cuestionario.json";
    a.click();
};

document.addEventListener('change', e => {
    if (e.target.id === 'importar-json') {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                quizEnEdicion = JSON.parse(event.target.result);
                renderizarEditor();
            } catch(e) { alert("Error al leer el JSON"); }
        };
        reader.readAsText(e.target.files[0]);
    }
});
