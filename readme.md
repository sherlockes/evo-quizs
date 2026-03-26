# Quizs-Evo 📝

**Quizs-Evo** es una plataforma web ligera y potente diseñada para la gestión de cuestionarios interactivos en el ámbito educativo. Desarrollada originalmente para la asignatura de Física y Química en el **IES Ángel Sanz Briz**, esta herramienta facilita la evaluación continua permitiendo a los docentes gestionar alumnos y exámenes de forma centralizada, mientras que los estudiantes reciben retroalimentación didáctica inmediata.

## ✨ Características Principales

### 👨‍🏫 Panel de Administración
- **Gestión de Alumnos:** Permite el registro individual o la importación masiva mediante archivos **CSV** (ideal para listas de clase de Séneca/Excel).
- **Control de Cuestionarios:** Sistema para crear, activar, desactivar y organizar exámenes por curso o nivel.
- **Editor en la Nube:** Interfaz visual para modificar preguntas, opciones y explicaciones técnicas en tiempo real.
- **Seguimiento de Resultados:** Tabla de calificaciones con exportación a **Excel**, incluyendo tiempos de realización y fecha de entrega.

### 🎓 Interfaz del Alumno
- **Panel Personalizado:** Los estudiantes acceden mediante su correo y solo visualizan los exámenes activos asignados a su curso.
- **Motor de Exámenes:** Interfaz limpia con barra de progreso y cálculo de nota dinámico.
- **Feedback Formativo:** Si un alumno falla, el sistema muestra una explicación detallada para reforzar el aprendizaje.
- **Registro Automático:** Las notas se envían directamente a Firebase al finalizar el intento.

## 🛠️ Stack Tecnológico

- **Frontend:** HTML5, CSS3 (Diseño Responsive y Variables) y JavaScript Vanilla (ES6+).
- **Backend & Base de Datos:** **Firebase** (Firestore y Authentication) para persistencia y seguridad.
- **Librerías Externas:**
  - [PapaParse](https://www.papaparse.com/): Para el procesamiento de archivos CSV.
  - Firebase SDK: Integración nativa con servicios de Google.

## 📂 Estructura del Proyecto

```text
.
├── index.html          # Punto de entrada único (Login y contenedores de vistas)
├── admin.js            # Lógica de gestión de usuarios, exámenes y estadísticas
├── alumno.js           # Lógica del motor de cuestionarios para estudiantes
├── config.js           # Configuración de Firebase y constantes globales
├── style.css           # Hoja de estilos principal (Modo oscuro/claro y layout)
├── cuestionarios/      # Almacén de archivos JSON (ej. contaminacion_atmosferica.json)
└── ai.sh               # Script de utilidad del proyecto

## 🚀 Configuración e Instalación
Clonar el repositorio:

``` Bash
git clone [https://github.com/tu-usuario/quizs-evo.git](https://github.com/tu-usuario/quizs-evo.git)
```

Configurar Firebase:
Edita el archivo config.js con las credenciales de tu proyecto en Firebase Console:

``` JavaScript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-app.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "tu-app-id"
};
```
Asignar Administrador:
En el mismo archivo config.js, define el correo electrónico que tendrá acceso al panel de control:

``` JavaScript
const CORREO_ADMIN = "tu-correo-profesor@ejemplo.com";
``` 
Ejecución:
Para que los módulos de JavaScript funcionen correctamente, abre el archivo index.html usando un servidor local (como Live Server en VS Code o python -m http.server).

## 📊 Formato de Datos (JSON)
La aplicación gestiona los cuestionarios bajo este esquema de datos:

``` JSON
[
  {
    "pregunta": "¿Qué impacto tiene la radiación UV excesiva?",
    "opciones": [
      "Mejora la visión",
      "Causa daltonismo",
      "Provoca cataratas oculares",
      "No afecta"
    ],
    "respuestaCorrecta": 2,
    "explicacion": "La falta de protección de la capa de ozono daña el cristalino."
  }
]
```
