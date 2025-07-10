import axios from 'axios';


export type SessionInfo = {
    email: string;
    name: string;
    role: string;
    is_active: boolean;
    is_verified: boolean;
};

async function fetchSession() {
    try {
        const response = await axios.get('/api/auth/user');
        const data = response.data;
        console.log('Session Info:', data);
        return {
            success: true,
            data: data,
        };
    } catch (error: any) {
        console.error('Error fetching session:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || 'Failed to fetch session',
        };
    }
}


export { fetchSession };
