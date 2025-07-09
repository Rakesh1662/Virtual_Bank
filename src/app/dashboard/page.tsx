
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, UserData } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  addDoc,
  serverTimestamp,
  onSnapshot,
  limit,
  orderBy,
  or,
  Timestamp,
} from 'firebase/firestore';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Wallet, Landmark, Loader2 } from "lucide-react"
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const sendMoneySchema = z.object({
  recipientMobile: z.string().regex(/^\d{10}$/, { message: "Must be a 10-digit mobile number." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }).min(1, { message: "Amount must be at least ₹1." }),
  mpin: z.string().regex(/^\d{4}$/, { message: "MPIN must be a 4-digit number." }),
});

interface Transaction {
    id: string;
    type: 'sent' | 'received';
    counterparty: string;
    amount: string;
    date: string;
}

export default function DashboardPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    
    const [displayData, setDisplayData] = useState<UserData | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    const form = useForm<z.infer<typeof sendMoneySchema>>({
        resolver: zodResolver(sendMoneySchema),
        defaultValues: {
            recipientMobile: '',
            amount: 0,
            mpin: '',
        },
    });

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);

        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setDisplayData(doc.data() as UserData);
            }
        });

        const transactionsRef = collection(db, 'transactions');
        const q = query(
            transactionsRef,
            or(where('senderId', '==', user.uid), where('receiverId', '==', user.uid)),
            orderBy('timestamp', 'desc'),
            limit(5)
        );
        
        const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
            const transactionsData = snapshot.docs.map(doc => {
                const data = doc.data();
                const isSent = data.senderId === user.uid;
                const transactionDate = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date();

                return {
                    id: doc.id,
                    type: isSent ? 'sent' : 'received',
                    counterparty: isSent ? data.receiverName : data.senderName,
                    amount: data.amount.toFixed(2),
                    date: format(transactionDate, 'yyyy-MM-dd'),
                };
            });
            setRecentTransactions(transactionsData);
            setIsLoading(false); // Data loaded
        }, (error) => {
            console.error("Transaction listener error:", error);
            setIsLoading(false);
        });

        return () => {
            unsubscribeUser();
            unsubscribeTransactions();
        };
    }, [user]);

    async function handleSendMoney(values: z.infer<typeof sendMoneySchema>) {
        if (!user || !userData) return;
        setIsSending(true);

        if (values.mpin !== userData.mpin) {
            toast({ variant: 'destructive', title: 'Error', description: 'Incorrect MPIN.' });
            setIsSending(false);
            return;
        }

        const transferAmount = values.amount;
        const commission = transferAmount * 0.01;
        const totalDeduction = transferAmount + commission;

        if (userData.accountBalance < totalDeduction) {
            toast({ variant: 'destructive', title: 'Error', description: 'Insufficient balance.' });
            setIsSending(false);
            return;
        }
        
        if (userData.mobileNumber === values.recipientMobile) {
            toast({ variant: 'destructive', title: 'Error', description: "You cannot send money to yourself." });
            setIsSending(false);
            return;
        }

        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('mobileNumber', '==', values.recipientMobile));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                toast({ variant: 'destructive', title: 'Error', description: 'Recipient not found.' });
                setIsSending(false);
                return;
            }

            const receiverDoc = querySnapshot.docs[0];
            const receiverId = receiverDoc.id;
            const receiverData = receiverDoc.data();

            await runTransaction(db, async (transaction) => {
                const senderDocRef = doc(db, 'users', user.uid);
                const receiverDocRef = doc(db, 'users', receiverId);

                const senderDoc = await transaction.get(senderDocRef);
                if (!senderDoc.exists() || senderDoc.data().accountBalance < totalDeduction) {
                    throw new Error("Insufficient balance.");
                }

                // Update balances
                transaction.update(senderDocRef, { 
                    accountBalance: senderDoc.data().accountBalance - totalDeduction,
                    commissionPaid: (senderDoc.data().commissionPaid || 0) + commission,
                });
                transaction.update(receiverDocRef, { 
                    accountBalance: receiverData.accountBalance + transferAmount 
                });

                // Record transaction
                const transactionsColRef = collection(db, 'transactions');
                await addDoc(transactionsColRef, {
                    senderId: user.uid,
                    senderName: userData.fullName,
                    receiverId: receiverId,
                    receiverName: receiverData.fullName,
                    amount: transferAmount,
                    commission: commission,
                    timestamp: serverTimestamp(),
                    location: 'Online Transfer',
                });
            });

            toast({ title: 'Success', description: `₹${transferAmount} sent to ${receiverData.fullName}.` });
            form.reset();
        } catch (error: any) {
            console.error("Transaction failed:", error);
            toast({ variant: 'destructive', title: 'Transaction Failed', description: error.message || "An unexpected error occurred." });
        } finally {
            setIsSending(false);
        }
    }
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Account Balance
                        </CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{displayData?.accountBalance?.toFixed(2) ?? '0.00'}</div>
                        <p className="text-xs text-muted-foreground">
                            Available to spend
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Commission Paid
                        </CardTitle>
                        <Landmark className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{displayData?.commissionPaid?.toFixed(2) ?? '0.00'}</div>
                        <p className="text-xs text-muted-foreground">
                            Total commission on transfers
                        </p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>
                            A quick look at your last few transactions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Counterparty</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                                    <TableHead className="text-right">Type</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentTransactions.length > 0 ? recentTransactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>
                                            <div className="font-medium">{tx.counterparty}</div>
                                        </TableCell>
                                        <TableCell className="text-right">₹{tx.amount}</TableCell>
                                        <TableCell className="hidden sm:table-cell">{tx.date}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={tx.type === 'sent' ? 'destructive' : 'secondary'} className="capitalize">
                                                {tx.type}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No recent transactions</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Send Money</CardTitle>
                        <CardDescription>
                            Quickly transfer funds to another user.
                        </CardDescription>
                    </CardHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSendMoney)}>
                            <CardContent className="space-y-4">
                                <FormField control={form.control} name="recipientMobile" render={({ field }) => (
                                    <FormItem><Label>Recipient's Mobile</Label><FormControl><Input placeholder="Enter 10-digit mobile no." {...field} disabled={isSending} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem><Label>Amount (₹)</Label><FormControl><Input type="number" placeholder="0.00" {...field} disabled={isSending} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="mpin" render={({ field }) => (
                                    <FormItem><Label>Your MPIN</Label><FormControl><Input type="password" placeholder="••••" {...field} maxLength={4} disabled={isSending} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isSending}>
                                    {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Send Money
                                </Button>
                            </CardFooter>
                        </form>
                    </Form>
                </Card>
            </div>
        </>
    );
}
