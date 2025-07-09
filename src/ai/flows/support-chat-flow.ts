'use server';
/**
 * @fileOverview A support chatbot flow for VeriBank.
 *
 * - supportChat - A function that handles the chat interaction.
 * - SupportChatInput - The input type for the supportChat function.
 * - SupportChatOutput - The return type for the supportChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

// Define schemas for the flow
const SupportChatInputSchema = z.object({
  userId: z.string().describe('The UID of the user asking the question.'),
  query: z.string().describe("The user's question."),
});
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;

const SupportChatOutputSchema = z.string().describe("The chatbot's response.");
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;


// Define a tool to fetch transaction history
const getTransactionHistory = ai.defineTool(
  {
    name: 'getTransactionHistory',
    description: "Fetches the transaction history for the current user. Use this tool ONLY when the user explicitly asks about their past transactions or transfer history.",
    inputSchema: z.object({}), // No input needed from LLM, userId is passed from context
    outputSchema: z.array(z.object({
        type: z.enum(['sent', 'received']),
        counterparty: z.string(),
        amount: z.number(),
        date: z.string(),
    })),
  },
  async (_, context) => { // The `context` object contains flow-level parameters.
    const { userId } = context.params;
    if (!userId) {
        throw new Error('User ID is required to fetch transaction history.');
    }

    const transactionsRef = collection(db, 'transactions');
    
    // Create queries for both sent and received transactions
    const sentQuery = query(transactionsRef, where('senderId', '==', userId));
    const receivedQuery = query(transactionsRef, where('receiverId', '==', userId));

    const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
    ]);
    
    const transactions: { type: 'sent' | 'received'; counterparty: string; amount: number; date: string; rawDate: Date }[] = [];
    
    const processDoc = (doc: any, type: 'sent' | 'received') => {
        const data = doc.data();
        // Ensure timestamp is valid before processing
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
            const transactionDate = (data.timestamp as Timestamp).toDate();
            transactions.push({
                type: type,
                counterparty: type === 'sent' ? data.receiverName : data.senderName,
                amount: data.amount,
                date: transactionDate.toLocaleDateString(),
                rawDate: transactionDate
            });
        }
    };

    sentSnapshot.forEach(doc => processDoc(doc, 'sent'));
    receivedSnapshot.forEach(doc => processDoc(doc, 'received'));

    // Sort all transactions by date and take the most recent 10
    transactions.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    return transactions.slice(0, 10).map(({rawDate, ...rest}) => rest); // Remove rawDate before returning
  }
);


// Define the main prompt for the chatbot
const supportChatPrompt = ai.definePrompt({
    name: 'supportChatPrompt',
    system: `You are a friendly and helpful customer support chatbot for VeriBank.
Your goal is to assist users with their questions about their banking account.
When a user asks about their transaction history, you MUST use the getTransactionHistory tool to get the data and then answer their question based on the tool's output.
Do not make up transaction data. Be concise and clear in your responses.
Summarize the transaction data in a human-readable way. Do not just list the raw data.
For example, instead of a JSON list, say "You received 500 from John on May 15th and sent 200 to Jane on May 14th."
If you don't know the answer to a question, politely say "I'm sorry, I can only help with questions about your VeriBank account and transaction history."`,
    tools: [getTransactionHistory],
    input: { schema: SupportChatInputSchema },
    output: { format: 'text' },
    prompt: `{{{query}}}`,
});

// Define the main flow that brings everything together
const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: SupportChatInputSchema,
    outputSchema: SupportChatOutputSchema,
  },
  async (input) => {
    const response = await supportChatPrompt(input);
    return response.text;
  }
);

// Exported wrapper function for the client to call
export async function supportChat(input: SupportChatInput): Promise<SupportChatOutput> {
  return await supportChatFlow(input);
}
