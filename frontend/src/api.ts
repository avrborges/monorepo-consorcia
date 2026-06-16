// src/api.ts

// 🆕 Detecta automáticamente la IP o dominio desde donde estás visualizando la app
const currentHostname = window.location.hostname;

// Definimos la URL base apuntando dinámicamente al puerto 5000 de tu Backend
const API_URL = `http://${currentHostname}:5000/api`;

/**
 * Función para enviar las credenciales de login al backend
 * @param email Correo ingresado por el usuario
 * @param password Contraseña ingresada por el usuario
 */
export const loginRequest = async (email: string, password: string) => {
  try {
    // Hacemos la petición POST al endpoint dinámico
    const response = await fetch(`${API_URL}/users/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    // Transformamos la respuesta del servidor a un objeto JSON manejable
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error en la conexión con la API:", error);
    return { success: false, message: "No se pudo conectar con el servidor." };
  }
};