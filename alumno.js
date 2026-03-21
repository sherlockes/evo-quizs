import { db, auth } from './config.js';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let preguntasActuales = [];
let indicePregunta = 0;
let puntuacion = 0;
let startTime; // Para medir el tiempo
let idExamenActual = "";
let tituloExamenActual = "";

export function cargarListaExamenes(cursoAlumno) {
    const q = query(collection(db, "cuestionarios"), where("curso", "==", cursoAlumno), where("activo", "==", true));
    
    onSnapshot(q, (snapshot) => {
        const contenedor = document.getElementById('lista-examenes');
        if (!contenedor) return;
        contenedor.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const quiz = docSnap.data();
            const id = docSnap.id; // Usamos el ID de Firebase
            
            const div = document.createElement('div');
            div.className = "quiz-card"; // Usa tus estilos de antes
            div.innerHTML = `
                <span>${quiz.titulo}</span>
                <button class="btn-primary" style="width: auto; margin:0;" 
                    onclick="iniciarExamen('${id}', '${quiz.titulo}')">Comenzar</button>
            `;
            contenedor.appendChild(div);
        });
    });
}

// Asegúrate de que la función iniciarExamen reciba los dos parámetros
window.iniciarExamen = async (id, titulo) => {
    try {
        console.log("Intentando cargar examen con ID:", id); // Depuración
        
        const docRef = doc(db, "cuestionarios", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const datos = docSnap.data();
            
            // Verificamos si hay preguntas guardadas en la nube
            if (!datos.preguntas || datos.preguntas.length === 0) {
                alert("Este cuestionario aún no tiene preguntas guardadas en la nube. Ve al administrador y pulsa 'Guardar Cambios'.");
                return;
            }

            preguntasActuales = datos.preguntas;
            idExamenActual = id; // <--- Ahora sí funcionará
            tituloExamenActual = titulo;
            indicePregunta = 0;
            puntuacion = 0;
            startTime = Date.now();
            
            mostrarPregunta();
        } else {
            alert("El cuestionario no existe en la base de datos.");
        }
    } catch (e) {
        // CAMBIO CRÍTICO: Ahora nos dirá el error real en la consola
        console.error("Error detallado:", e);
        alert("Error técnico: " + e.message); 
    }
};


function mostrarPregunta() {
    const contenedor = document.getElementById('section-alumno');
    const data = preguntasActuales[indicePregunta];

    // Cálculo de la nota sobre las preguntas ya respondidas
    let notaActual = "0.0";
    if (indicePregunta > 0) {
        notaActual = ((puntuacion / indicePregunta) * 10).toFixed(1);
    }

    contenedor.innerHTML = `
        <div style="text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 0.9rem; color: #666; font-weight: 500;">Pregunta ${indicePregunta + 1} de ${preguntasActuales.length}</span>
                <div style="background: #007bff; color: white; padding: 5px 15px; border-radius: 8px; font-weight: bold; font-size: 1.2rem; min-width: 50px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${notaActual}
                </div>
            </div>
            
            <div style="background: #eee; height: 6px; border-radius: 3px; margin-bottom: 25px;">
                <div style="background: #007bff; height: 100%; width: ${(indicePregunta / preguntasActuales.length) * 100}%; border-radius: 3px; transition: 0.5s;"></div>
            </div>

            <h3 style="margin-bottom: 25px; line-height: 1.4; color: #333;">${data.pregunta}</h3>
            
            <div id="opciones-container">
                ${data.opciones.map((opcion, i) => `
                    <button class="btn-opcion" onclick="verificarRespuesta(${i})" 
                        style="width: 100%; text-align: left; padding: 15px; margin-bottom: 12px; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer; font-size: 1rem; transition: all 0.2s;">
                        ${opcion}
                    </button>
                `).join('')}
            </div>
            
            <div id="explicacion-container" class="hidden" style="margin-top: 20px; padding: 20px; border-radius: 8px; border-left: 5px solid #ffc107; background: #fff3cd; color: #856404; font-size: 0.95rem;">
                <strong style="display: block; margin-bottom: 8px; font-size: 1.05rem;">💡 Explicación:</strong>
                <span id="texto-explicacion"></span>
            </div>
            
            <button id="btn-siguiente" class="btn-primary hidden" onclick="proximaPregunta()" style="margin-top: 20px; background: #28a745; height: 55px; font-size: 1.1rem; width: 100%; box-shadow: 0 4px 10px rgba(40,167,69,0.2);">
                Siguiente pregunta →
            </button>
        </div>
    `;
}

window.verificarRespuesta = (seleccionado) => {
    const data = preguntasActuales[indicePregunta];
    const correcta = data.respuestaCorrecta;
    const botones = document.querySelectorAll('.btn-opcion');
    const explicacionDiv = document.getElementById('explicacion-container');
    const textoExplicacion = document.getElementById('texto-explicacion');
    const btnSiguiente = document.getElementById('btn-siguiente');

    botones.forEach(b => b.disabled = true);

    if (seleccionado === correcta) {
        puntuacion++;
        botones[seleccionado].style.background = "#d4edda";
        botones[seleccionado].style.borderColor = "#28a745";
        botones[seleccionado].style.color = "#155724";
        botones[seleccionado].style.fontWeight = "bold";
        
        setTimeout(proximaPregunta, 1000);
    } else {
        botones[seleccionado].style.background = "#f8d7da";
        botones[seleccionado].style.borderColor = "#dc3545";
        botones[seleccionado].style.color = "#721c24";
        
        botones[correcta].style.background = "#d4edda";
        botones[correcta].style.borderColor = "#28a745";
        botones[correcta].style.fontWeight = "bold";

        textoExplicacion.innerText = data.explicacion || "Repasa este concepto en los materiales del curso.";
        explicacionDiv.classList.remove('hidden');
        btnSiguiente.classList.remove('hidden');
    }
};

window.proximaPregunta = () => {
    indicePregunta++;
    if (indicePregunta < preguntasActuales.length) {
        mostrarPregunta();
    } else {
        mostrarResultado();
    }
};

async function mostrarResultado() {
    const contenedor = document.getElementById('section-alumno');
    const notaFinal = ((puntuacion / preguntasActuales.length) * 10).toFixed(1);
    
    // Calcular tiempo transcurrido
    const endTime = Date.now();
    const segundosTotales = Math.floor((endTime - startTime) / 1000);
    const minutos = Math.floor(segundosTotales / 60);
    const segundos = segundosTotales % 60;
    const tiempoTexto = `${minutos}m ${segundos}s`;

    // --- GUARDAR RESULTADO EN FIREBASE ---
    try {
        await addDoc(collection(db, "resultados"), {
            email: auth.currentUser.email,
            quizId: idExamenActual,      // Guardamos el ID del documento
            quizTitulo: tituloExamenActual,
            nota: parseFloat(notaFinal),
            tiempo: tiempoTexto,
            fecha: serverTimestamp()
        });
    } catch (e) {
        console.error("Error al guardar resultado:", e);
    }

    // (El resto del innerHTML de mostrarResultado se mantiene igual)
    contenedor.innerHTML = `
        <div style="padding: 40px 20px; text-align: center;">
            <h2>Cuestionario Finalizado</h2>
            <div style="font-size: 5rem; font-weight: bold; color: #007bff; margin: 15px 0;">${notaFinal}</div>
            <p>Tiempo total: ${tiempoTexto}</p>
            <button class="btn-primary" onclick="window.location.reload()">Finalizar y Salir</button>
        </div>
    `;
}
