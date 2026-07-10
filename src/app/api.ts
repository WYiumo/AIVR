import axios from "axios";

const API_BASE_URL = 'http://10.88.80.67:9020';

const api = axios.create({
  baseURL: API_BASE_URL,
});



export default api;