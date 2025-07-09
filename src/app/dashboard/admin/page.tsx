
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { useAuth, UserData } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, doc, runTransaction } from 'firebase/firestore';
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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from "lucide-react";


const manageUserSchema = z.object({
    role: z.enum(['user', 'admin']),
    addBalance: z.coerce.number().min(0, "Cannot add a negative amount.").default(0),
});

export default function AdminPage() {
    const { userData, loading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [allUsers, setAllUsers] = useState<UserData[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    
    const form = useForm<z.infer<typeof manageUserSchema>>({
        resolver: zodResolver(manageUserSchema),
    });

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
                    const usersList = querySnapshot.docs
                        .map(doc => doc.data() as UserData)
                        .filter(user => user.uid !== userData.uid); // Filter out the current admin
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
    
    useEffect(() => {
        if (selectedUser) {
            form.reset({
                role: selectedUser.role || 'user',
                addBalance: 0,
            });
        }
    }, [selectedUser, form]);

    async function handleUpdateUser(values: z.infer<typeof manageUserSchema>) {
        if (!selectedUser) return;
        setIsUpdating(true);
    
        try {
            const userDocRef = doc(db, 'users', selectedUser.uid);
            await runTransaction(db, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) {
                    throw new Error("User document not found!");
                }
                const currentData = userDoc.data();
                const currentBalance = currentData.accountBalance ?? 0;
                const amountToAdd = values.addBalance || 0;
    
                const updatedData: Partial<UserData> = {
                    role: values.role,
                    accountBalance: currentBalance + amountToAdd,
                };
    
                transaction.update(userDocRef, updatedData);
            });
    
            // Update local state to show changes immediately
            setAllUsers(prevUsers => prevUsers.map(u => 
                u.uid === selectedUser.uid 
                ? { ...u, role: values.role, accountBalance: (u.accountBalance ?? 0) + (values.addBalance || 0) } 
                : u
            ));
            
            toast({ title: "Success", description: `${selectedUser.fullName}'s profile has been updated.` });
            setSelectedUser(null);
        } catch (error: any) {
            console.error("Failed to update user:", error);
            toast({ variant: 'destructive', title: "Update Failed", description: error.message });
        } finally {
            setIsUpdating(false);
        }
    }


    if (loading || isFetching || userData?.role !== 'admin') {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <>
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
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allUsers.length > 0 ? (
                                    allUsers.map((user) => (
                                        <TableRow key={user.uid}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar>
                                                        <AvatarImage src={user.profilePictureUrl} alt={user.fullName || 'User Avatar'} />
                                                        <AvatarFallback>{user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="font-medium">{user.fullName || 'N/A'}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>{user.email || 'No email'}</div>
                                                <div className="text-sm text-muted-foreground">{user.mobileNumber || 'No mobile'}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">₹{user.accountBalance?.toFixed(2) ?? '0.00'}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">{user.role || 'user'}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>Manage</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">No other users found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!selectedUser} onOpenChange={(isOpen) => !isOpen && setSelectedUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage User: {selectedUser?.fullName}</DialogTitle>
                        <DialogDescription>Update user role and account balance.</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleUpdateUser)} className="space-y-4 pt-4">
                            <FormField control={form.control} name="role" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isUpdating}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="user">User</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="addBalance" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Add to Balance (₹)</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0" {...field} disabled={isUpdating} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setSelectedUser(null)} disabled={isUpdating}>Cancel</Button>
                                <Button type="submit" disabled={isUpdating}>
                                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}
