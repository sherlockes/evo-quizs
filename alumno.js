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

    contenedor.innerHTML = `
        <div style="text-align: left;">
            <p>Pregunta ${indicePregunta + 1} de ${preguntasActuales.length}</p>
            <div style="background: #eee; height: 8px; border-radius: 4px; margin-bottom: 20px;">
                <div style="background: #007bff; height: 100%; width: ${(indicePregunta / preguntasActuales.length) * 100}%; border-radius: 4px; transition: 0.3s;"></div>
            </div>
            <h3 style="margin-bottom: 20px;">${data.pregunta}</h3>
            <div id="opciones-container">
                ${data.opciones.map((opcion, i) => `
                    <button class="btn-opcion" onclick="verificarRespuesta(${i})" 
                        style="width: 100%; text-align: left; padding: 12px; margin-bottom: 8px; border: 1px solid #ddd; background: white; border-radius: 6px;">
                        ${opcion}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

window.verificarRespuesta = (seleccionado) => {
    const correcta = preguntasActuales[indicePregunta].respuestaCorrecta;
    const botones = document.querySelectorAll('.btn-opcion');

    // Deshabilitar botones para evitar doble clic
    botones.forEach(b => b.disabled = true);

    if (seleccionado === correcta) {
        botones[seleccionado].style.background = "#d4edda";
        botones[seleccionado].style.borderColor = "#28a745";
        puntuacion++;
    } else {
        botones[seleccionado].style.background = "#f8d7da";
        botones[seleccionado].style.borderColor = "#dc3545";
        botones[correcta].style.background = "#d4edda";
    }

    // Feedback corto y siguiente pregunta (o final)
    setTimeout(() => {
        indicePregunta++;
        if (indicePregunta < preguntasActuales.length) {
            mostrarPregunta();
        } else {
            mostrarResultado();
        }
    }, 1500);
};

function mostrarResultado() {
    const contenedor = document.getElementById('section-alumno');
    const porcentaje = Math.round((puntuacion / preguntasActuales.length) * 100);
    
    contenedor.innerHTML = `
        <h2>¡Cuestionario finalizado!</h2>
        <div style="font-size: 48px; margin: 20px 0;">${porcentaje}%</div>
        <p>Has acertado ${puntuacion} de ${preguntasActuales.length} preguntas.</p>
        <button class="btn-primary" onclick="window.location.reload()">Volver al Inicio</button>
    `;
}
