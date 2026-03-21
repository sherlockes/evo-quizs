import { db, secondaryAuth, CORREO_ADMIN } from './config.js';
import { 
    collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
                    <td style="white-space: nowrap;">
                        <button class="btn-accion" style="background:#6f42c1; color:white;" onclick="cargarQuizAlEditor('${q.ruta}')">✏️</button>
                        <button class="btn-accion btn-edit" onclick="alternarEstadoQuiz('${id}', ${q.activo})">On/Off</button>
                        <button class="btn-accion btn-borrar" onclick="borrarQuiz('${id}')">X</button>
                    </td>
                </tr>`;
        });
    });
}

// Función para cargar un archivo JSON existente al editor
window.cargarQuizAlEditor = async (ruta) => {
    try {
        const response = await fetch(ruta);
        if (!response.ok) throw new Error("No se pudo encontrar el archivo JSON en el servidor.");
        quizEnEdicion = await response.json();
        
        // Cambiamos a la pestaña del editor y renderizamos
        document.getElementById('tab-btn-editor').click();
        renderizarEditor();
        alert("Cuestionario cargado en el editor");
    } catch (e) {
        alert("Error al cargar: " + e.message);
    }
};

window.alternarEstadoQuiz = async (id, estado) => {
    await updateDoc(doc(db, "cuestionarios", id), { activo: !estado });
};

window.borrarQuiz = async (id) => {
    if(confirm("¿Eliminar cuestionario del sistema?")) await deleteDoc(doc(db, "cuestionarios", id));
};

export async function guardarNuevoQuiz(datos) {
    try {
        let r = datos.ruta.trim();
        if (!r.startsWith('cuestionarios/')) r = `cuestionarios/${r}`;
        await addDoc(collection(db, "cuestionarios"), { ...datos, ruta: r });
        return true;
    } catch (e) { throw e; }
}

// --- LÓGICA DEL EDITOR JSON (DISEÑO COMPACTO) ---
export function renderizarEditor() {
    const contenedor = document.getElementById('lista-preguntas-editor');
    if (!contenedor) return;
    contenedor.innerHTML = "";

    if (quizEnEdicion.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Cuestionario vacío.</p>';
        return;
    }

    quizEnEdicion.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "pregunta-edit";
        div.id = `preg-${index}`;
        
        div.innerHTML = `
            <div class="editor-header-fila">
                <span class="editor-num">${index + 1}</span>
                <input type="text" class="editor-enunciado-input" placeholder="Pregunta..." value="${item.pregunta}" onchange="actualizarDato(${index}, 'pregunta', this.value)">
                <button class="btn-borrar-compact" onclick="borrarPreguntaEditor(${index})">✕</button>
            </div>
            
            <div class="editor-opciones-columna">
                ${item.opciones.map((opt, i) => `
                    <div class="opcion-fila">
                        <input type="radio" name="correcta-${index}" ${item.respuestaCorrecta === i ? 'checked' : ''} onchange="actualizarDato(${index}, 'respuestaCorrecta', ${i})">
                        <input type="text" placeholder="Opción ${i+1}" value="${opt}" onchange="actualizarOpcion(${index}, ${i}, this.value)">
                    </div>
                `).join('')}
            </div>
            
            <div style="padding-left: 35px;">
                <textarea placeholder="Explicación..." onchange="actualizarDato(${index}, 'explicacion', this.value)">${item.explicacion || ''}</textarea>
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
    setTimeout(() => {
        const el = document.getElementById(`preg-${quizEnEdicion.length - 1}`);
        if(el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.querySelector('input').focus();
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
        reader.onload = (ev) => {
            quizEnEdicion = JSON.parse(ev.target.result);
            renderizarEditor();
        };
        reader.readAsText(e.target.files[0]);
    }
});
