'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, UserData } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function AdminPage() {
    const { userData, loading } = useAuth();
    const router = useRouter();
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [isFetching, setIsFetching] = useState(true);

    useEffect(() => {
        if (!loading && userData?.role !== 'admin') {
            router.push('/dashboard');
        }
    }, [userData, loading, router]);

    useEffect(() => {
        if (userData?.role === 'admin') {
            const fetchUsers = async () => {
                setIsFetching(true);
                try {
                    const usersCollectionRef = collection(db, 'users');
                    const usersQuery = query(usersCollectionRef);
                    const querySnapshot = await getDocs(usersQuery);
                    const usersList = querySnapshot.docs.map(doc => doc.data() as UserData);
                    setAllUsers(usersList);
                } catch (error) {
                    console.error("Failed to fetch users:", error);
                } finally {
                    setIsFetching(false);
                }
            };
            fetchUsers();
        }
    }, [userData]);

    if (loading || isFetching || userData?.role !== 'admin') {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Admin Panel</CardTitle>
                <CardDescription>View and manage all users in the system.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email / Mobile</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                                <TableHead className="text-center">Role</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {allUsers.length > 0 ? (
                                allUsers.map((user) => (
                                    <TableRow key={user.uid}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={user.profilePictureUrl} alt={user.fullName} />
                                                    <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className="font-medium">{user.fullName}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>{user.email}</div>
                                            <div className="text-sm text-muted-foreground">{user.mobileNumber}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">₹{user.accountBalance.toFixed(2)}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">{user.role}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">No users found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
