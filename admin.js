import { db, secondaryAuth, CORREO_ADMIN } from './config.js';

import { 
    collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, setDoc, getDoc, getDocs, query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Variable global para el editor
let quizEnEdicion = [];
let idQuizActual = null;
let idQuizResultadosActual = null; // Para saber qué estamos exportando/borrando
let datosResultadosActuales = [];  // Para guardar temporalmente lo que exportaremos

// --- GESTIÓN DE ALUMNOS (Con ordenado por Curso y Email) ---
export function activarSincronizacionAlumnos() {
    onSnapshot(collection(db, "usuarios"), (snap) => {
        const t = document.getElementById('cuerpo-tabla');
        if (!t) return;
        t.innerHTML = "";

        // 1. Pasamos los datos a un array para poder manipularlos
        let listaAlumnos = [];
        snap.forEach(d => {
            const u = d.data();
            // Filtramos al administrador para que no aparezca en la lista
            if(u.email !== CORREO_ADMIN) {
                listaAlumnos.push({ id: d.id, ...u });
            }
        });

        // 2. Aplicamos el ordenado: primero por CURSO y luego por EMAIL
        listaAlumnos.sort((a, b) => {
            // Convertimos a minúsculas para que el orden sea real (A-Z)
            const cursoA = String(a.curso).toLowerCase();
            const cursoB = String(b.curso).toLowerCase();
            const emailA = String(a.email).toLowerCase();
            const emailB = String(b.email).toLowerCase();

            // Comparar por curso
            if (cursoA < cursoB) return -1;
            if (cursoA > cursoB) return 1;

            // Si el curso es el mismo, comparar por email
            if (emailA < emailB) return -1;
            if (emailA > emailB) return 1;

            return 0;
        });

        // 3. Renderizamos la tabla con la lista ya ordenada
        listaAlumnos.forEach(u => {
            t.innerHTML += `<tr>
                <td>${u.email}</td>
                <td><b>${u.curso}</b></td>
                <td>
                    <button class="btn-accion btn-edit" onclick="editarAlumno('${u.id}','${u.curso}')">E</button>
                    <button class="btn-accion btn-borrar" onclick="borrarAlumno('${u.id}')">X</button>
                </td>
            </tr>`;
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
        // 1. Intentamos crear el usuario en Authentication
        try {
            await createUserWithEmailAndPassword(secondaryAuth, email, pass);
            // Si se crea de cero, cerramos la sesión secundaria inmediatamente
            await signOut(secondaryAuth);
        } catch (authError) {
            // Si el error es que ya existe en Auth, no lanzamos error, seguimos adelante
            if (authError.code === 'auth/email-already-in-use') {
                console.log("El usuario ya existe en Firebase Auth. Actualizando base de datos...");
            } else {
                // Si es otro error (password corta, email mal escrito), sí lo lanzamos
                throw authError;
            }
        }

        // 2. Creamos o actualizamos el documento en Firestore
        // Usamos setDoc para que si ya existía el registro, lo sobrescriba con el nuevo curso
        await setDoc(doc(db, "usuarios", email), { 
            email: email.toLowerCase().trim(), 
            curso: curso.trim(), 
            rol: "alumno" 
        });

        return true;
    } catch (e) {
        console.error("Error completo en creación:", e);
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
            const colorCheck = q.activo ? "#28a745" : "#6c757d";

            tabla.innerHTML += `
                <tr>
                    <td>${q.titulo}</td>
                    <td><b>${q.curso}</b></td>
                    <td style="text-align:center;">${q.activo ? '✅' : '❌'}</td>
                    <td style="white-space: nowrap;">
                        <button class="btn-accion" style="background:#546e7a; color:white;" 
                            onclick="verResultadosQuiz('${id}', '${q.titulo}')">📊</button>
                        
                        <button class="btn-accion" style="background:#546e7a; color:white;" 
                            onclick="editarInfoQuiz('${id}', '${q.titulo}', '${q.curso}', '${q.ruta}', ${q.activo})">🏷️</button>
                        
                        <button class="btn-accion" style="background:#546e7a; color:white;" 
                            onclick="cargarQuizAlEditor('${id}')">✏️</button>
                        
                        <button class="btn-accion" style="background:${colorCheck}; color:white;" 
                            onclick="alternarEstadoQuiz('${id}', ${q.activo})">✔️</button>
                        
                        <button class="btn-accion btn-borrar" onclick="borrarQuiz('${id}')">X</button>
                    </td>
                </tr>`;
        });
    });
}

// Actualizamos la edición para incluir el estado activo
window.editarInfoQuiz = async (id, tituloActual, cursoActual, rutaActual, activoActual) => {
    const nuevoTitulo = prompt("Nuevo título:", tituloActual);
    if (nuevoTitulo === null) return;

    const nuevoCurso = prompt("Nuevo curso:", cursoActual);
    if (nuevoCurso === null) return;

    const nuevaRuta = prompt("Ruta del archivo:", rutaActual);
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

// Función para mostrar los resultados de un quiz específico
window.verResultadosQuiz = async (id, titulo) => {
    idQuizResultadosActual = id; // Guardamos el ID para usarlo luego
    const viewQuizzes = document.getElementById('view-quizzes');
    const viewResultados = document.getElementById('view-resultados');
    const cuerpoTabla = document.getElementById('tabla-resultados-body');
    const tituloRes = document.getElementById('res-titulo-quiz');

    tituloRes.innerText = `Resultados: ${titulo}`;
    cuerpoTabla.innerHTML = "<tr><td colspan='4'>Cargando...</td></tr>";

    viewQuizzes.classList.add('hidden');
    viewResultados.classList.remove('hidden');

    try {
        // Consulta directa y sencilla
        const q = query(
            collection(db, "resultados"), 
            where("quizId", "==", id),
            orderBy("fecha", "desc")
        );

        const snap = await getDocs(q);
        cuerpoTabla.innerHTML = "";

        if (snap.empty) {
            cuerpoTabla.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Sin intentos registrados.</td></tr>";
            return;
        }

        snap.forEach(d => {
            const res = d.data();
            const fecha = res.fecha?.toDate().toLocaleString() || "---";
            datosResultadosActuales.push({ fecha, email: res.email, tiempo: res.tiempo, nota: res.nota });
            cuerpoTabla.innerHTML += `
                <tr>
                    <td>${fecha}</td>
                    <td>${res.email}</td>
                    <td>${res.tiempo}</td>
                    <td style="font-weight:bold; color:${res.nota >= 5 ? 'green' : 'red'}">${res.nota}</td>
                </tr>
            `;
        });
    } catch (e) {
        console.error(e);
        cuerpoTabla.innerHTML = "<tr><td colspan='4'>Error al cargar resultados.</td></tr>";
    }
};

window.volverAQuizzes = () => {
    document.getElementById('view-resultados').classList.add('hidden');
    document.getElementById('view-quizzes').classList.remove('hidden');
};


window.alternarEstadoQuiz = async (id, estado) => {
    await updateDoc(doc(db, "cuestionarios", id), { activo: !estado });
};

// Carga DIRECTA desde Firestore
window.cargarQuizAlEditor = async (id) => {
    try {
        idQuizActual = id;
        const docRef = doc(db, "cuestionarios", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const datos = docSnap.data();
    
            // --- ACTUALIZAMOS EL TÍTULO EN LA INTERFAZ ---
            document.getElementById('editor-titulo-quiz').innerText = `Editando: ${datos.titulo} (${datos.curso})`;

            // Si el quiz es nuevo y no tiene preguntas aún, inicializamos array vacío
            quizEnEdicion = datos.preguntas || [];
            
            document.getElementById('tab-btn-editor').click();
            renderizarEditor();
        }
    } catch (e) {
        alert("Error al acceder a la base de datos: " + e.message);
    }
};

// Guardado DIRECTO en Firestore
window.guardarEnNube = async () => {
    if (!idQuizActual) return alert("Selecciona un cuestionario de la lista primero.");
    
    try {
        const docRef = doc(db, "cuestionarios", idQuizActual);
        await updateDoc(docRef, {
            preguntas: quizEnEdicion,
            ultimaModificacion: new Date()
        });
        alert("✅ Cambios guardados en Firebase correctamente.");
    } catch (e) {
        alert("Error al guardar: " + e.message);
    }
};

window.borrarQuiz = async (id) => {
    if (!confirm("¿Eliminar este cuestionario y todos sus resultados permanentemente?")) return;

    try {
        // 1. Buscamos todos los resultados que tengan este quizId
        const q = query(collection(db, "resultados"), where("quizId", "==", id));
        const resultadosSnap = await getDocs(q);

        // 2. Borramos los resultados asociados en bloque
        const promesasBorrado = [];
        resultadosSnap.forEach((resDoc) => {
            promesasBorrado.push(deleteDoc(doc(db, "resultados", resDoc.id)));
        });

        // Esperamos a que se borren todos los resultados (si los hay)
        if (promesasBorrado.length > 0) {
            await Promise.all(promesasBorrado);
            console.log(`Se eliminaron ${promesasBorrado.length} registros de notas.`);
        }

        // 3. Finalmente, borramos el cuestionario de la colección principal
        await deleteDoc(doc(db, "cuestionarios", id));
        
        alert("Cuestionario y resultados eliminados con éxito.");

    } catch (e) {
        console.error("Error en el proceso de borrado:", e);
        alert("No se pudo eliminar todo: " + e.message);
    }
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

// --- LÓGICA DE IMPORTACIÓN DESDE PC ---
document.getElementById('importar-json').addEventListener('change', (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = (evento) => {
        try {
            const nuevasPreguntas = JSON.parse(evento.target.result);

            // COMPROBACIÓN: Verificamos que sea una lista válida
            if (!Array.isArray(nuevasPreguntas)) {
                return alert("El archivo no tiene el formato de lista de preguntas adecuado.");
            }

            // --- CAMBIO CLAVE: CONCATENAR EN LUGAR DE SOBRESCRIBIR ---
            // Usamos el operador spread (...) para añadir las nuevas al final de las actuales
            quizEnEdicion = [...quizEnEdicion, ...nuevasPreguntas];

            renderizarEditor(); // Refrescamos la vista
            
            alert(`✅ Se han añadido ${nuevasPreguntas.length} preguntas nuevas. Tienes un total de ${quizEnEdicion.length}.`);
            
            // Limpiamos el input para poder importar el mismo archivo otra vez si se desea
            e.target.value = ""; 
            
        } catch (err) {
            alert("Error al procesar el JSON: Asegúrate de que el formato sea correcto.");
            console.error(err);
        }
    };
    reader.readAsText(archivo);
});

// --- IMPORTACIÓN MASIVA CSV ---
export async function importarAlumnosCSV(lista) {
    let exitos = 0;
    let errores = 0;

    const limpiar = (v) => v ? String(v).trim() : "";

    for (const fila of lista) {
        // Extraemos valores intentando detectar si vienen por nombre de columna o por posición
        let email = limpiar(fila.email || fila['email'] || Object.values(fila)[0]);
        let pass = limpiar(fila.password || fila['password'] || Object.values(fila)[1]);
        let curso = limpiar(fila.curso || fila['curso'] || Object.values(fila)[2]);

        // --- DETECCIÓN DE ERROR DE SEPARADOR (Coma vs Punto y coma) ---
        // Si el email contiene un punto y coma, es que Excel lo guardó mal
        if (email.includes(';')) {
            const partes = email.split(';');
            email = limpiar(partes[0]);
            pass = limpiar(partes[1]);
            curso = limpiar(partes[2]);
        }

        if (!email || !pass || !curso) {
            console.warn("Fila incompleta o mal formateada:", fila);
            errores++;
            continue;
        }

        try {
            // Intentamos crear en Auth
            try {
                await createUserWithEmailAndPassword(secondaryAuth, email, pass);
                await signOut(secondaryAuth);
            } catch (authError) {
                // Si el error es que ya existe, no lo contamos como fallo crítico
                if (authError.code !== 'auth/email-already-in-use') {
                    throw authError;
                }
                console.log(`El usuario ${email} ya existe en Auth, actualizando datos...`);
            }

            // Guardamos/Actualizamos en Firestore
            await setDoc(doc(db, "usuarios", email), { email, curso, rol: "alumno" });
            exitos++;
        } catch (e) {
            console.error(`Error crítico con ${email}:`, e.message);
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

// --- FUNCIÓN PARA BORRAR SOLO LOS RESULTADOS ---
window.borrarResultadosQuiz = async () => {
    if (!idQuizResultadosActual) return;
    if (!confirm("¿Seguro que quieres borrar TODOS los resultados de este examen? Esta acción no se puede deshacer.")) return;

    try {
        const q = query(collection(db, "resultados"), where("quizId", "==", idQuizResultadosActual));
        const snap = await getDocs(q);
        
        const promesas = snap.docs.map(d => deleteDoc(doc(db, "resultados", d.id)));
        await Promise.all(promesas);

        alert("Historial de notas eliminado.");
        verResultadosQuiz(idQuizResultadosActual, document.getElementById('res-titulo-quiz').innerText.replace('Resultados: ', ''));
    } catch (e) {
        alert("Error al borrar: " + e.message);
    }
};

// --- FUNCIÓN PARA EXPORTAR A EXCEL (CSV) LOS RESULTADOS ---
window.exportarResultadosExcel = () => {
    if (datosResultadosActuales.length === 0) return alert("No hay datos para exportar.");

    const titulo = document.getElementById('res-titulo-quiz').innerText;
    
    // Cabecera del CSV
    let csvContent = "\uFEFF"; // BOM para que Excel detecte bien los acentos
    csvContent += "Fecha;Alumno;Tiempo;Nota\n";

    // Contenido
    datosResultadosActuales.forEach(r => {
        csvContent += `${r.fecha};${r.email};${r.tiempo};${r.nota}\n`;
    });

    // Crear el archivo y descargarlo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${titulo.replace(':', '')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.cerrarEditor = () => {
    // 1. "Borramos" los datos de la memoria
    idQuizActual = null;
    quizEnEdicion = [];

    // 2. Limpiamos visualmente el título y la lista
    const tituloEditor = document.getElementById('editor-titulo-quiz');
    if (tituloEditor) tituloEditor.innerText = "Editor de Cuestionarios";
    
    const listaPreguntas = document.getElementById('lista-preguntas-editor');
    if (listaPreguntas) listaPreguntas.innerHTML = "";

    // 3. Volvemos a la pestaña principal (Cuestionarios)
    document.getElementById('tab-btn-quizzes').click();

    // 4. Refrescamos el editor para que muestre el mensaje de "Editor en reposo"
    renderizarEditor();
};
