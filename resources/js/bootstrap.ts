import axios from 'axios';

// Set base URL dengan HTTPS - gunakan origin dari window location
axios.defaults.baseURL = window.location.origin;

// Enable credentials untuk Laravel Sanctum
axios.defaults.withCredentials = true;

// Set default headers
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
axios.defaults.headers.common['Accept'] = 'application/json';

// Optional: Add interceptor untuk debugging
axios.interceptors.request.use(request => {
    console.log('🔍 Axios Request URL:', request.url);
    console.log('🔍 Full URL:', `${request.baseURL}${request.url}`);
    return request;
});

axios.interceptors.response.use(
    response => response,
    error => {
        console.error('❌ Axios Error:', error.message);
        if (error.code === 'ERR_NETWORK') {
            console.error('Network error - check HTTPS/HTTP mismatch');
        }
        return Promise.reject(error);
    }
);

window.axios = axios;
