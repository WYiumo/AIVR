import axios from "axios";

const API_BASE_URL = 'http://10.88.80.67:18080';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const openclawAPI = {
    sendmessage: (message: string) => api.post('/api/sendmessage', { message }),
    
}


export default api;