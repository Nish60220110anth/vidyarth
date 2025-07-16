import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import Head from 'next/head';

import Sidebar from '@/components/Sidebar';


export default function Dashboard() {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [name, setName] = useState('');
    const [id, setId] = useState(0);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
        const fetchUser = async () => {
            const res = await fetch('/api/auth/user');
            if (res.ok) {
                const data = await res.json();
                setEmail(data.email);
                setRole(data.role);
                setName(data.name);
                setId(data.id);
            } else {
                router.push('/');
            }
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/user', { method: 'DELETE' });
        toast.success('Logged out successfully');
        router.push('/');
    };

    if (!mounted) return null;

    return (
        <>
            <Sidebar email={email} role={role} onLogout={handleLogout} name={name} id={id}/>
        </>
    );
}
