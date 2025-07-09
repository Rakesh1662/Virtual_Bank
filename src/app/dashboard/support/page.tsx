
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { supportChat } from '@/ai/flows/support-chat-flow';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function SupportPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: "Hello! I'm VeriBank's AI assistant. How can I help you today? You can ask me about your account or recent transactions.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await supportChat({ query: input, userId: user.uid });
      const modelMessage: Message = { role: 'model', content: response };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = { role: 'model', content: "I'm sorry, something went wrong. Please try again." };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[calc(100vh-8rem)] w-full flex flex-col">
      <CardHeader>
        <CardTitle>AI Support Chat</CardTitle>
        <CardDescription>Ask me anything about your account or transactions.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
            <div className="space-y-6">
            {messages.map((message, index) => (
                <div key={index} className={cn('flex items-start gap-4', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                {message.role === 'model' && (
                    <Avatar className="h-9 w-9 border">
                    <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                )}
                <div className={cn(
                    'max-w-md rounded-lg px-4 py-3 text-sm',
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                    {message.content}
                </div>
                {message.role === 'user' && (
                    <Avatar className="h-9 w-9 border">
                        <AvatarImage src={user?.photoURL ?? undefined} />
                        <AvatarFallback><UserIcon className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                )}
                </div>
            ))}
            {isLoading && (
                <div className="flex items-start gap-4 justify-start">
                    <Avatar className="h-9 w-9 border">
                        <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                    <div className="max-w-md rounded-lg px-4 py-3 text-sm bg-muted flex items-center">
                        <Loader2 className="h-5 w-5 animate-spin"/>
                    </div>
                </div>
            )}
            </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="pt-4 border-t">
        <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
          <Input
            id="message"
            placeholder="Type your message..."
            className="flex-1"
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
