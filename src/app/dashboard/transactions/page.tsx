
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { MapPin, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";

interface Transaction {
    id: string;
    type: 'sent' | 'received';
    amount: number;
    commission: number;
    counterparty: string;
    timestamp: Date;
    location: string;
}

export default function TransactionsPage() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // State for separate queries
    const [sentTransactions, setSentTransactions] = useState<Transaction[]>([]);
    const [receivedTransactions, setReceivedTransactions] = useState<Transaction[]>([]);

    const [dateFilter, setDateFilter] = useState<Date | undefined>();
    const [typeFilter, setTypeFilter] = useState('all');
    const [amountFilter, setAmountFilter] = useState('');

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        };

        setIsLoading(true);
        const transactionsRef = collection(db, 'transactions');
        
        const mapDocToTransaction = (doc: any): Transaction | null => {
            const data = doc.data();
            if (!data.timestamp || typeof data.timestamp.toDate !== 'function') {
                console.warn(`Skipping transaction with invalid timestamp: ${doc.id}`);
                return null;
            }
            const isSent = data.senderId === user.uid;
            const transactionTimestamp = (data.timestamp as Timestamp).toDate();

            return {
                id: doc.id,
                type: isSent ? 'sent' : 'received',
                amount: data.amount,
                commission: data.commission,
                counterparty: isSent ? data.receiverName : data.senderName,
                timestamp: transactionTimestamp,
                location: data.location,
            };
        };

        // Query for sent transactions
        const sentQuery = query(transactionsRef, where('senderId', '==', user.uid));
        const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
            setSentTransactions(snapshot.docs.map(mapDocToTransaction).filter(Boolean) as Transaction[]);
        }, (error) => console.error("Error fetching sent transactions:", error));

        // Query for received transactions
        const receivedQuery = query(transactionsRef, where('receiverId', '==', user.uid));
        const unsubscribeReceived = onSnapshot(receivedQuery, (snapshot) => {
            setReceivedTransactions(snapshot.docs.map(mapDocToTransaction).filter(Boolean) as Transaction[]);
        }, (error) => console.error("Error fetching received transactions:", error));

        return () => {
            unsubscribeSent();
            unsubscribeReceived();
        }
    }, [user]);

    // Effect to combine and sort transactions
    useEffect(() => {
        const allTransactionsMap = new Map<string, Transaction>();
        sentTransactions.forEach(tx => allTransactionsMap.set(tx.id, tx));
        receivedTransactions.forEach(tx => allTransactionsMap.set(tx.id, tx));

        const combined = Array.from(allTransactionsMap.values());
        combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        setTransactions(combined);
        if (isLoading) {
            setIsLoading(false);
        }
    }, [sentTransactions, receivedTransactions, isLoading]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            const dateMatch = !dateFilter || format(tx.timestamp, 'yyyy-MM-dd') === format(dateFilter, 'yyyy-MM-dd');
            const typeMatch = typeFilter === 'all' || tx.type === typeFilter;
            const amountMatch = !amountFilter || tx.amount >= parseFloat(amountFilter);
            return dateMatch && typeMatch && amountMatch;
        });
    }, [transactions, dateFilter, typeFilter, amountFilter]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                    View and filter all your past transactions.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                        <DatePicker onSelect={setDateFilter} />
                    </div>
                    <div className="flex gap-4">
                        <Select onValueChange={setTypeFilter} defaultValue="all">
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="received">Received</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input 
                            placeholder="Min amount..." 
                            type="number" 
                            className="w-[180px]"
                            value={amountFilter}
                            onChange={(e) => setAmountFilter(e.target.value)}
                        />
                    </div>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Type</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="hidden md:table-cell">Timestamp</TableHead>
                                <TableHead className="hidden lg:table-cell">Location</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredTransactions.length > 0 ? (
                                filteredTransactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>
                                            <Badge variant={tx.type === 'sent' ? 'destructive' : 'secondary'} className="capitalize flex items-center gap-1 w-fit">
                                                {tx.type === 'sent' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                                {tx.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{tx.counterparty}</div>
                                            {tx.type === 'sent' && <div className="text-xs text-muted-foreground">Commission: ₹{tx.commission.toFixed(2)}</div>}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{format(tx.timestamp, 'yyyy-MM-dd hh:mm a')}</TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                {tx.location}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {tx.type === 'sent' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">No transactions found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
