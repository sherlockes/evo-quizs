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

function mostrarResultado() {
    const contenedor = document.getElementById('section-alumno');
    const notaFinal = ((puntuacion / preguntasActuales.length) * 10).toFixed(1);
    
    contenedor.innerHTML = `
        <div style="padding: 40px 20px; text-align: center;">
            <h2 style="color: #333;">Cuestionario Finalizado</h2>
            <div style="font-size: 5rem; font-weight: bold; color: #007bff; margin: 15px 0; text-shadow: 2px 2px 10px rgba(0,123,255,0.1);">${notaFinal}</div>
            <div style="background: #f1f8ff; color: #007bff; padding: 10px 20px; border-radius: 30px; display: inline-block; font-weight: bold; margin-bottom: 30px;">
                ${puntuacion} aciertos de ${preguntasActuales.length}
            </div>
            <br>
            <button class="btn-primary" onclick="window.location.reload()" style="max-width: 280px;">Finalizar y Salir</button>
        </div>
    `;
}
