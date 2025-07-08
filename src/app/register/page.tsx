'use client';

import { RegisterForm } from '@/components/auth/register-form';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RegisterPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
        router.push('/dashboard');
        }
    }, [user, loading, router]);

    if (loading || user) {
        return null;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-e0e0e0 dark:bg-background p-4">
        <RegisterForm />
        </div>
    );
}
