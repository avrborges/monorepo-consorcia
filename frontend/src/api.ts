// src/api.ts
import axios, { AxiosError } from 'axios';

const currentHostname = window.location.hostname;

// Creamos la instancia
const api = axios.create({
  baseURL: `http://${currentHostname}:5000/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

// Definimos una interfaz para el error esperado de nuestra API
interface ApiError {
  success: boolean;
  message: string;
}

export const loginRequest = async (email: string, password: string) => {
  try {
    const response = await api.post('/users/login', { email, password });
    return response.data;
  } catch (error: unknown) {
    // Si es un error de Axios, intentamos devolver el mensaje del servidor
    if (error instanceof AxiosError && error.response) {
      return error.response.data as ApiError;
    }
    // Si no es un error de Axios o no tiene respuesta, devolvemos un mensaje genérico
    return { success: false, message: "Error al conectar con el servidor" };
  }
};