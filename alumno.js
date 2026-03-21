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

    // Calculamos la nota actual en tiempo real
    const notaActual = ((puntuacion / preguntasActuales.length) * 10).toFixed(1);

    contenedor.innerHTML = `
        <div style="text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 0.9rem; color: #666;">Pregunta ${indicePregunta + 1} de ${preguntasActuales.length}</span>
                <span style="background: #007bff; color: white; padding: 4px 10px; border-radius: 20px; font-weight: bold;">Nota: ${notaActual}</span>
            </div>
            
            <div style="background: #eee; height: 6px; border-radius: 3px; margin-bottom: 20px;">
                <div style="background: #007bff; height: 100%; width: ${(indicePregunta / preguntasActuales.length) * 100}%; border-radius: 3px; transition: 0.5s;"></div>
            </div>

            <h3 style="margin-bottom: 20px;">${data.pregunta}</h3>
            <div id="opciones-container">
                ${data.opciones.map((opcion, i) => `
                    <button class="btn-opcion" onclick="verificarRespuesta(${i})" 
                        style="width: 100%; text-align: left; padding: 12px; margin-bottom: 8px; border: 1px solid #ddd; background: white; border-radius: 6px; transition: 0.2s;">
                        ${opcion}
                    </button>
                `).join('')}
            </div>
            
            <div id="explicacion-container" class="hidden" style="margin-top: 20px; padding: 15px; border-radius: 8px; line-height: 1.5;"></div>
            
            <button id="btn-siguiente" class="btn-primary hidden" onclick="proximaPregunta()" style="margin-top: 15px; background: #28a745;">Continuar</button>
        </div>
    `;
}

window.verificarRespuesta = (seleccionado) => {
    const data = preguntasActuales[indicePregunta];
    const correcta = data.respuestaCorrecta;
    const botones = document.querySelectorAll('.btn-opcion');
    const explicacionDiv = document.getElementById('explicacion-container');
    const btnSiguiente = document.getElementById('btn-siguiente');

    botones.forEach(b => b.disabled = true);

    if (seleccionado === correcta) {
        botones[seleccionado].style.background = "#d4edda";
        botones[seleccionado].style.borderColor = "#28a745";
        puntuacion++;
        
        // Si acierta, pasamos rápido a la siguiente (1 segundo)
        setTimeout(proximaPregunta, 1000);
    } else {
        // Si falla, mostramos el error y la explicación
        botones[seleccionado].style.background = "#f8d7da";
        botones[seleccionado].style.borderColor = "#dc3545";
        botones[correcta].style.background = "#d4edda";
        botones[correcta].style.borderColor = "#28a745";

        // Mostrar explicación
        explicacionDiv.innerHTML = `<strong>💡 Explicación:</strong><br>${data.explicacion || "No hay explicación disponible para esta pregunta."}`;
        explicacionDiv.style.background = "#fff3cd";
        explicacionDiv.style.color = "#856404";
        explicacionDiv.style.border = "1px solid #ffeeba";
        explicacionDiv.classList.remove('hidden');
        
        // Mostramos botón para que el usuario decida cuándo seguir tras leer
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
    const notaFinal = ((puntuacion / preguntasActuales.length) * 10).toFixed(1);
    
    let mensaje = "¡Sigue practicando!";
    if (notaFinal >= 9) mensaje = "¡Excelente dominio!";
    else if (notaFinal >= 5) mensaje = "¡Aprobado!";

    contenedor.innerHTML = `
        <div style="padding: 20px;">
            <h2>Cuestionario Finalizado</h2>
            <div style="font-size: 3rem; font-weight: bold; color: #007bff; margin: 20px 0;">${notaFinal}</div>
            <p style="font-size: 1.2rem;">Has acertado <b>${puntuacion}</b> de <b>${preguntasActuales.length}</b></p>
            <p style="color: #666;">${mensaje}</p>
            <br>
            <button class="btn-primary" onclick="window.location.reload()">Finalizar y Volver</button>
        </div>
    `;
}
