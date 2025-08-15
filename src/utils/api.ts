import axios from 'axios';
import { baseUrl } from '@/lib/config';
export type SessionInfo = {
    email: string;
    name: string;
    role: string;
    is_active: boolean;
    is_verified: boolean;
};

async function fetchSession() {
    try {
        const response = await axios.get(`${baseUrl}/api/auth/user`);

        if (!response.data.success) {
            console.error('Error fetching session:', response.data.message);
            return {
                success: false, 
                data: null
            };
        } 

        return {
            success: true,
            data: response.data.data
        };
    } catch (error: any) {
        console.error('Error fetching session:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.message || 'Failed to fetch session',
        };
    }
}


export { fetchSession };
