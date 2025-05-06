'use client';
import { useState, FormEvent } from 'react';
import { Button, Input, Card, CardBody, Spinner } from '@nextui-org/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your DeFi assistant. Ask me about protocols like Aave, Uniswap, or any other DeFi questions.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Sorry, I couldn't process that request. Please try again." 
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Network error. Please check your connection and try again." 
      }]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  // Function to format messages with markdown
  const formatMessage = (content: string): string => {
    // Basic markdown formatting for numbers, percentages, and protocol names
    return content
      .replace(/\$(\d+(?:,\d+)*(?:\.\d+)?)/g, '**$&**') // Bold dollar amounts
      .replace(/(\d+(?:\.\d+)?)%/g, '**$&**'); // Bold percentages
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">DeFi RAG Chatbot</h1>
      
      <Card className="mb-4">
        <CardBody className="p-0">
          <div className="max-h-[500px] overflow-y-auto p-4">
            {messages.map((msg, i) => (
              <div key={i} className={`p-4 mb-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-100 ml-12' : 'bg-gray-100 mr-12'}`}>
                <div className="font-semibold mb-1">{msg.role === 'user' ? 'You' : 'DeFi Assistant'}</div>
                <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          fullWidth
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="Ask about DeFi protocols, TVL, yields..."
          disabled={isLoading}
        />
        <Button type="submit" color="primary" disabled={isLoading}>
          {isLoading ? <Spinner size="sm" color="white" /> : 'Send'}
        </Button>
      </form>
    </div>
  );
}