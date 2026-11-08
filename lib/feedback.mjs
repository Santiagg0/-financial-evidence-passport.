export function validateFeedback(input) {
  const allowedTypes = [
    "confusion",
    "bug",
    "suggestion"
  ];

  if (!input || !allowedTypes.includes(input.type)) {
    throw new Error("Selecciona un tipo de comentario válido.");
  }

  if (typeof input.message !== "string") {
    throw new Error("Escribe un comentario válido.");
  }

  const message = input.message.trim();

  if (message.length < 5 || message.length > 500) {
    throw new Error(
      "El comentario debe tener entre 5 y 500 caracteres."
    );
  }

  return {
    type: input.type,
    message
  };
}
