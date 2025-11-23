const SAMPLE_CONTENT = [
  {
    id: genId(),
    subject: "Matemáticas",
    title: "Sumas básicas",
    body: "<p>Aprendamos a sumar números naturales. Ejemplo: 2 + 3 = 5.</p>",
    media: "media/matematicas.mp4",
    quiz: {
      question: "¿Cuánto es 4 + 2?",
      choices: ["4", "5", "6"],
      answer: 2
    }
  },
  {
    id: genId(),
    subject: "Matemáticas",
    title: "Restas básicas",
    body: "<p>Aprendamos a restar números naturales. Ejemplo: 3 - 2 = 1.</p>",
    media: "media/matematicas.mp4",
    quiz: {
      question: "¿Cuánto es 9 - 2?",
      choices: ["4", "7", "6"],
      answer: 1
    }
  },
  {
    id: genId(),
    subject: "Ciencias",
    title: "Ciclo del agua",
    body: "<p>El ciclo del agua comprende evaporación, condensación, precipitación y escorrentía.</p>",
    media: "",
    quiz: {
      question: "¿Qué proceso convierte agua en vapor?",
      choices: ["Condensación", "Evaporación", "Precipitación"],
      answer: 1
    }
  },
  {
    id: genId(),
    subject: "Lenguaje",
    title: "Lectura comprensiva",
    body: "<p>Práctica de lectura con preguntas cortas para fortalecer comprensión.</p>",
    media: "",
    quiz: {
      question: "¿Qué debes hacer para entender un texto?",
      choices: ["Leer con atención", "Saltar líneas", "Ignorar el título"],
      answer: 0
    }
  }
];
