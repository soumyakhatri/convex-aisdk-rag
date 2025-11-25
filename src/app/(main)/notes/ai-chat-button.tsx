"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Bot, Expand, Minimize, Send, Trash, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, UIMessage } from "ai";
import { useAuthToken } from "@convex-dev/auth/react";
import Markdown from "@/components/markdown";

const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.replace(/.cloud$/, ".site")

export function AIChatButton() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setChatOpen(true)} variant="outline">
        <Bot />
        <span>Ask AI</span>
      </Button>
      <AIChatBox open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}

interface AIChatBoxProps {
  open: boolean;
  onClose: () => void;
}

const initialMessage: UIMessage[] = [{
  id: "welcome-message",
  role: "assistant",
  parts: [{ type: "text", text: "I am your notes assistant. I can find and summarize and information you saved." }],
}]

function AIChatBox({ open, onClose }: AIChatBoxProps) {
  const token = useAuthToken()
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState<string>("")

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `${convexSiteUrl}/api/chat`,
      headers: {
        Authorization: `Bearer ${token}`
      }
    }),
    messages: initialMessage,
    maxSteps: 3
  })

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isProcessing = status === "streaming" || status === "submitted"
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, open])


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim().length === 0 && !isProcessing) return
    sendMessage({
      text: input
    })
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if(e.key === "Enter" && !e.shiftKey){
      handleSubmit(e)
    }
  }

  if (!open) return null;

  const lastMessageIsUser = messages[messages.length - 1].role === "user"

  return (
    <div
      className={cn(
        "animate-in slide-in-from-bottom-10 bg-card fixed right-4 bottom-4 z-50 flex flex-col rounded-lg border shadow-lg duration-300 2xl:right-16",
        isExpanded
          ? "h-[650px] max-h-[90vh] w-[550px]"
          : "h-[500px] max-h-[80vh] w-80 sm:w-96"
      )}
    >
      <div className="bg-primary text-primary-foreground flex items-center justify-between rounded-t-lg border-b p-3">
        <div className="flex items-center gap-2">
          <Bot size={18} />
          <h3 className="font-medium">Notes Assistant</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary-foreground hover:bg-primary/90 h-8 w-8"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? <Minimize /> : <Expand />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setMessages(initialMessage) }}
            className="text-primary-foreground hover:bg-primary/90 h-8 w-8"
            title="Clear chat"
          >
            <Trash />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary/90 h-8 w-8"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {messages.map(message => <ChatMessage key={message.id} message={message} />)}
        {status === "submitted" && lastMessageIsUser && <Loader/>}
        {status === "error" && <ErrorMessage/>}
        <div ref={messagesEndRef} />
      </div>

      <form className="flex gap-2 border-t p-3" onSubmit={handleSubmit}>
        <Textarea
          placeholder="Type your message..."
          className="max-h-[120px] min-h-[40px] resize-none overflow-y-auto"
          maxLength={1000}
          autoFocus
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="submit" size="icon" disabled={isProcessing || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

function Loader() {
  return (
    <div className="ml-2 flex items-center gap-1 py-2">
      <div className="bg-primary size-1.5 animate-pulse rounded-full" />
      <div className="bg-primary size-1.5 animate-pulse rounded-full delay-150" />
      <div className="bg-primary size-1.5 animate-pulse rounded-full delay-300" />
    </div>
  );
}

type ChatMessageProps = {
  message: UIMessage
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const currentStep = message.parts[message.parts.length - 1]
  return <div
    className={cn(
      "mb-2 flex max-w-[80%] flex-col prose dark:prose-invert",
      message.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
    )}
  >
    <div
      className={cn(
        "prose dark:prose-invert rounded-lg px-3 py-2 text-sm",
        message.role === "user"
          ? "bg-primary text-primary-foreground"
          : "bg-muted first:prose-p:mt-0"
      )}
    >
      {message.role === "assistant" && (
        <div className="text-muted-foreground mb-1 flex items-center gap-1 text-xs font-medium">
          <Bot className="text-primary size-3" />
          AI Assistant
        </div>
      )}
      {currentStep?.type === "text" && (
        <Markdown >{currentStep.text}</Markdown>
      )}
      {currentStep.type === "tool-invocation" && (
        <div className="italic animate-pulse">Searching notes...</div>
      )}
    </div>
  </div>
}

const ErrorMessage = () => {
  return <div className="text-sm text-red-500">Something went wrong. Please try again.</div>
}
