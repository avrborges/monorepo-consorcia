// src/api.ts

// Definimos la URL base de nuestro backend en Node.js
const API_URL = "http://192.168.1.38:5000/api";

/**
 * Función para enviar las credenciales de login al backend
 * @param email Correo ingresado por el usuario
 * @param password Contraseña ingresada por el usuario
 */
export const loginRequest = async (email: string, password: string) => {
  try {
    // Hacemos la petición POST al endpoint que creamos en el backend
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