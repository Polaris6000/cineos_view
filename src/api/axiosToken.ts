import axios from "axios";

const api = axios.create({
    baseURL: "",
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config;
})

api.interceptors.response.use((response) => response,
    async (error) => {
    if (error.response?.status === 401) {
        const accessToken = localStorage.getItem("accessToken")
        const refreshToken = localStorage.getItem("refreshToken")

        try {
            const res = await axios.post('/api/admin/refresh', {
                accessToken,
                refreshToken,
            })
            localStorage.setItem("accessToken", res.data.accessToken)
            localStorage.setItem("refreshToken", res.data.refreshToken)

            error.config.headers.Authorization = `Bearer ${res.data.accessToken}`
            return axios(error.config)
        } catch {
            localStorage.clear()
            window.location.href = '/admin/login'
        }
    }
    return Promise.reject(error)
    })

export default api