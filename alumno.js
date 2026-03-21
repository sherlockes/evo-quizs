import { db } from './config.js';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let preguntasActuales = [];
let indicePregunta = 0;
let puntuacion = 0;

export function cargarListaExamenes(cursoAlumno) {
    const q = query(collection(db, "cuestionarios"), where("curso", "==", cursoAlumno), where("activo", "==", true));
    
    onSnapshot(q, (snapshot) => {
        const contenedor = document.getElementById('lista-examenes');
        if (!contenedor) return;
        contenedor.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const quiz = docSnap.data();
            const div = document.createElement('div');
            div.style = "background: white; padding: 15px; margin-bottom: 10px; border-radius: 8px; border-left: 5px solid #007bff; display: flex; justify-content: space-between; align-items: center;";
            div.innerHTML = `
                <span>${quiz.titulo}</span>
                <button class="btn-primary" style="width: auto; margin: 0;" onclick="iniciarExamen('${quiz.ruta}')">Comenzar</button>
            `;
            contenedor.appendChild(div);
        });
    });
}

window.iniciarExamen = async (ruta) => {
    try {
        const response = await fetch(ruta);
        preguntasActuales = await response.json();
        
        // Barajar preguntas si quieres (opcional, como en tu otro script)
        preguntasActuales.sort(() => Math.random() - 0.5);
        
        indicePregunta = 0;
        puntuacion = 0;
        
        mostrarPregunta();
    } catch (e) {
        alert("Error al cargar el archivo JSON: " + e.message);
    }
};

function mostrarPregunta() {
    const contenedor = document.getElementById('section-alumno');
    const data = preguntasActuales[indicePregunta];

    // --- CÁLCULO DE NOTA ACTUALIZADO ---
    // Si es la primera pregunta, la nota es 0. 
    // Después, calculamos: (Aciertos / Preguntas Respondidas) * 10
    let notaActual = 0;
    if (indicePregunta > 0) {
        notaActual = ((puntuacion / indicePregunta) * 10).toFixed(1);
    }

    contenedor.innerHTML = `
        <div style="text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 0.9rem; color: #666;">Pregunta ${indicePregunta + 1} de ${preguntasActuales.length}</span>
                <div style="text-align: right;">
                    <span style="display: block; font-size: 0.7rem; color: #999; text-transform: uppercase;">Nota Temporal</span>
                    <span style="background: #007bff; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 1.1rem;">${notaActual}</span>
                </div>
            </div>
            
            <div style="background: #eee; height: 6px; border-radius: 3px; margin-bottom: 20px;">
                <div style="background: #007bff; height: 100%; width: ${(indicePregunta / preguntasActuales.length) * 100}%; border-radius: 3px; transition: 0.5s;"></div>
            </div>

            <h3 style="margin-bottom: 20px; line-height: 1.4;">${data.pregunta}</h3>
            <div id="opciones-container">
                ${data.opciones.map((opcion, i) => `
                    <button class="btn-opcion" onclick="verificarRespuesta(${i})" 
                        style="width: 100%; text-align: left; padding: 15px; margin-bottom: 10px; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer; transition: 0.2s;">
                        ${opcion}
                    </button>
                `).join('')}
            </div>
            
            <div id="explicacion-container" class="hidden" style="margin-top: 20px; padding: 20px; border-radius: 8px; border-left: 5px solid #ffc107; background: #fff3cd; color: #856404;">
                <strong style="display: block; margin-bottom: 5px;">💡 Explicación:</strong>
                <span id="texto-explicacion"></span>
            </div>
            
            <button id="btn-siguiente" class="btn-primary hidden" onclick="proximaPregunta()" style="margin-top: 20px; background: #28a745; height: 50px; font-size: 1.1rem;">
                Continuar a la siguiente pregunta →
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
        // ACIERTO
        puntuacion++;
        botones[seleccionado].style.background = "#d4edda";
        botones[seleccionado].style.borderColor = "#28a745";
        botones[seleccionado].style.color = "#155724";
        
        // Esperamos 1.2s para que vea que ha acertado y pasamos
        setTimeout(proximaPregunta, 1200);
    } else {
        // ERROR
        botones[seleccionado].style.background = "#f8d7da";
        botones[seleccionado].style.borderColor = "#dc3545";
        botones[seleccionado].style.color = "#721c24";
        
        botones[correcta].style.background = "#d4edda";
        botones[correcta].style.borderColor = "#28a745";

        // Mostrar la explicación del JSON
        textoExplicacion.innerText = data.explicacion || "No hay una explicación detallada para esta pregunta.";
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

function mostrarResultado() {
    const contenedor = document.getElementById('section-alumno');
    // Nota final sobre el total
    const notaFinal = ((puntuacion / preguntasActuales.length) * 10).toFixed(1);
    
    contenedor.innerHTML = `
        <div style="padding: 30px; text-align: center;">
            <h2 style="margin-bottom: 10px;">¡Cuestionario completado!</h2>
            <p style="color: #666;">Tu calificación final es:</p>
            <div style="font-size: 4rem; font-weight: bold; color: #007bff; margin: 20px 0;">${notaFinal}</div>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; display: inline-block; margin-bottom: 25px;">
                Aciertos: <b>${puntuacion}</b> de ${preguntasActuales.length}
            </div>
            <br>
            <button class="btn-primary" onclick="window.location.reload()" style="max-width: 250px;">Volver a mis cursos</button>
        </div>
    `;
}
