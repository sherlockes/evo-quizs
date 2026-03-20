import { db } from './config.js';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export function cargarListaExamenes(cursoAlumno) {
    const q = query(collection(db, "cuestionarios"), where("curso", "==", cursoAlumno), where("activo", "==", true));
    
    onSnapshot(q, (snapshot) => {
        const contenedor = document.getElementById('lista-examenes');
        if (!contenedor) return;
        contenedor.innerHTML = "";
        
        snapshot.forEach((docSnap) => {
            const quiz = docSnap.data();
            const div = document.createElement('div');
            div.className = "card-quiz"; // Puedes añadir este estilo a tu CSS
            div.innerHTML = `
                <b>${quiz.titulo}</b><br>
                <button class="btn-primary" onclick="iniciarExamen('${quiz.ruta}')">Comenzar</button>
            `;
            contenedor.appendChild(div);
        });
    });
}

window.iniciarExamen = async (ruta) => {
    try {
        const response = await fetch(ruta);
        const preguntas = await response.json();
        // Aquí llamarías a la función de pintar el quiz que desarrollaremos
        console.log("Cargando examen...", preguntas);
    } catch (e) {
        alert("Error al cargar el examen: " + e.message);
    }
};
