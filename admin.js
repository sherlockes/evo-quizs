import { db, secondaryAuth, CORREO_ADMIN } from './config.js';

import { 
    collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Variable global para el editor
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

// --- IMPORTANTE: Aquí está el export que te daba error ---
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
                    <td style="white-space: nowrap;">
                        <button class="btn-accion" style="background:#6f42c1; color:white;" 
                            onclick="editarInfoQuiz('${id}', '${q.titulo}', '${q.curso}', '${q.ruta}')" title="Editar Título/Curso/Ruta">🏷️</button>
                        
                        <button class="btn-accion" style="background:#6f42c1; color:white;" 
                            onclick="cargarQuizAlEditor('${q.ruta}')" title="Editar preguntas del JSON">✏️</button>
                        
                        <button class="btn-accion" style="background:#6f42c1; color:white;" 
                            onclick="alternarEstadoQuiz('${id}', ${q.activo})" title="Activar/Desactivar">✔️</button>
                        
                        <button class="btn-accion btn-borrar" onclick="borrarQuiz('${id}')" title="Eliminar">X</button>
                    </td>
                </tr>`;
        });
    });
}

// Función para editar todos los metadatos (Título, Curso y Ruta)
window.editarInfoQuiz = async (id, tituloActual, cursoActual, rutaActual) => {
    const nuevoTitulo = prompt("Nuevo título del cuestionario:", tituloActual);
    if (nuevoTitulo === null) return;

    const nuevoCurso = prompt("Nuevo curso:", cursoActual);
    if (nuevoCurso === null) return;

    const nuevaRuta = prompt("Ruta del archivo (ej: cuestionarios/test.json):", rutaActual);
    if (nuevaRuta === null) return;

    try {
        await updateDoc(doc(db, "cuestionarios", id), {
            titulo: nuevoTitulo,
            curso: nuevoCurso,
            ruta: nuevaRuta
        });
    } catch (e) {
        alert("Error al actualizar: " + e.message);
    }
};

window.alternarEstadoQuiz = async (id, estado) => {
    await updateDoc(doc(db, "cuestionarios", id), { activo: !estado });
};

// Esta función permite cargar un JSON que ya está en GitHub/Vercel al editor
window.cargarQuizAlEditor = async (ruta) => {
    try {
        const response = await fetch(ruta);
        if (!response.ok) throw new Error("No se pudo cargar el archivo. ¿Está subido a GitHub?");
        quizEnEdicion = await response.json();
        
        // Abrimos la pestaña del editor (Simulamos click en el botón del HTML)
        const btnEditor = document.getElementById('tab-btn-editor');
        if(btnEditor) btnEditor.click();
        
        renderizarEditor();
    } catch (e) {
        alert("Error: " + e.message);
    }
};



window.borrarQuiz = async (id) => {
    if(confirm("¿Eliminar del sistema?")) await deleteDoc(doc(db, "cuestionarios", id));
};

export async function guardarNuevoQuiz(datos) {
    try {
        let r = datos.ruta.trim();
        if (!r.startsWith('cuestionarios/')) r = `cuestionarios/${r}`;
        await addDoc(collection(db, "cuestionarios"), { ...datos, ruta: r });
        return true;
    } catch (e) { throw e; }
}

// --- LÓGICA DEL EDITOR JSON ---
export function renderizarEditor() {
    const contenedor = document.getElementById('lista-preguntas-editor');
    if (!contenedor) return;
    contenedor.innerHTML = "";

    if (quizEnEdicion.length === 0) {
        contenedor.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">El editor está vacío.</p>';
        return;
    }

    quizEnEdicion.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = "pregunta-edit";
        div.id = `preg-idx-${index}`;
        
        div.innerHTML = `
            <div class="editor-header-fila">
                <span class="editor-num">${index + 1}</span>
                <input type="text" class="editor-enunciado-input" value="${item.pregunta}" onchange="actualizarDato(${index}, 'pregunta', this.value)" placeholder="Pregunta...">
                <button class="btn-borrar-compact" onclick="borrarPreguntaEditor(${index})">✕</button>
            </div>
            <div class="editor-opciones-columna">
                ${item.opciones.map((opt, i) => `
                    <div class="opcion-fila">
                        <input type="radio" name="rad-${index}" ${item.respuestaCorrecta === i ? 'checked' : ''} onchange="actualizarDato(${index}, 'respuestaCorrecta', ${i})">
                        <input type="text" value="${opt}" onchange="actualizarOpcion(${index}, ${i}, this.value)" placeholder="Opción ${i+1}">
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

// Funciones globales para que los inputs funcionen
window.actualizarDato = (i, f, v) => { quizEnEdicion[i][f] = v; };
window.actualizarOpcion = (pi, oi, v) => { quizEnEdicion[pi].opciones[oi] = v; };

window.nuevaPregunta = () => {
    quizEnEdicion.push({ pregunta: "", opciones: ["", "", "", ""], respuestaCorrecta: 0, explicacion: "" });
    renderizarEditor();
    
    // Scroll automático
    setTimeout(() => {
        const el = document.getElementById(`preg-idx-${quizEnEdicion.length - 1}`);
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
    if(quizEnEdicion.length === 0) return alert("Nada que descargar");
    const blob = new Blob([JSON.stringify(quizEnEdicion, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "cuestionario.json";
    a.click();
};

// Importar local
document.addEventListener('change', e => {
    if (e.target.id === 'importar-json') {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                quizEnEdicion = JSON.parse(ev.target.result);
                renderizarEditor();
            } catch(err) { alert("Error en el formato JSON"); }
        };
        reader.readAsText(e.target.files[0]);
    }
});

// --- IMPORTACIÓN MASIVA CSV ---
export async function importarAlumnosCSV(lista) {
    let exitos = 0;
    let errores = 0;

    console.log("Datos recibidos para procesar:", lista); // Para depurar

    for (const alumno of lista) {
        // Intentamos leer por nombre de columna o por posición (0, 1, 2)
        const email = (alumno.email || alumno['email'] || Object.values(alumno)[0])?.trim();
        const pass = (alumno.password || alumno['password'] || Object.values(alumno)[1])?.trim();
        const curso = (alumno.curso || alumno['curso'] || Object.values(alumno)[2])?.trim();

        // Si falta el curso o el email, no podemos crear al usuario correctamente
        if (!email || !pass || !curso) {
            console.warn("Faltan datos en la fila:", alumno);
            errores++;
            continue;
        }

        try {
            await crearAlumnoManual(email, pass, curso);
            exitos++;
        } catch (e) {
            console.error("Error al crear usuario:", email, e.message);
            errores++;
        }
    }
    return { exitos, errores };
}

export async function borrarTodosLosAlumnos() {
    try {
        const querySnapshot = await getDocs(collection(db, "usuarios"));
        let cont = 0;
        
        // Usamos un bucle para borrar uno a uno, saltando al admin
        const promesas = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.email !== CORREO_ADMIN) {
                promesas.push(deleteDoc(doc(db, "usuarios", docSnap.id)));
                cont++;
            }
        });

        await Promise.all(promesas);
        return cont;
    } catch (e) {
        throw e;
    }
}
