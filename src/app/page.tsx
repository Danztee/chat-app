"use client";

import { supabase } from "@/lib/supabseClient";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");

    if (!storedUsername) {
      const enteredUsername = prompt("Please enter your username:") || "Guest";
      setUsername(enteredUsername);
      localStorage.setItem("username", enteredUsername);
    } else {
      setUsername(storedUsername);
    }

    fetchMessages();

    const subscription = supabase
      .channel("realtime_chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          // scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.log(error);
    } else {
      setMessages(data || []);
    }
  };

  async function sendMessage() {
    if (!newMessage.trim()) return;

    const { error } = await supabase
      .from("messages")
      .insert([{ username, message: newMessage }]);

    if (error) console.error(error);
    else {
      setNewMessage("");
      scrollToBottom();
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-200 mt-10">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-5">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Real-Time Chat</h1>
            <p className="text-sm text-blue-100">Logged in as: {username}</p>
          </div>
        </div>
      </div>

      <div className="h-[500px] overflow-y-auto p-5 space-y-4 bg-gray-50">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              msg.username === username ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-xl shadow-sm ${
                msg.username === username
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-800 border"
              }`}
            >
              <span className="font-semibold text-sm mr-2 opacity-80">
                {msg.username}:
              </span>
              {msg.message}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex p-4 border-t bg-white">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          className="flex-grow border border-gray-300 rounded-l-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400 text-black"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="bg-blue-500 text-white px-6 py-3 rounded-r-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
