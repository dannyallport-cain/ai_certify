'use client'

import React, { useState, useEffect, useRef } from 'react';

interface Step {
  name: string;
  label: string;
  type: 'text' | 'number' | 'textarea';
}

interface GuidedModeModalProps {
  open: boolean;
  steps: Step[];
  onClose: () => void;
  onComplete: (values: Record<string, string>) => void;
}

export default function GuidedModeModal({ open, steps, onClose, onComplete }: GuidedModeModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [messages, setMessages] = useState<{ role: 'bot' | 'user'; text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Speak the bot message
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = 'en-US';
      recog.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        handleSend();
      };
      recognitionRef.current = recog;
    }
  }, []);

  // On opening or step change, ask the next prompt
  useEffect(() => {
    if (!open) return;
    const step = steps[currentStep];
    // Randomized prompt variations
    const templates = [
      `Please enter ${step.label}.`,
      `Could you provide the ${step.label}?`,
      `Next, what is the ${step.label}?`,
      `Let’s fill in the ${step.label}.`
    ];
    const prompt = templates[Math.floor(Math.random() * templates.length)];
    setMessages((prev) => [...prev, { role: 'bot', text: prompt }]);
    speak(prompt);
    // Start speech recognition for STT
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  }, [open, currentStep]);

  // Scroll to bottom on message update
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const userText = inputValue.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    const newValues = { ...values, [steps[currentStep].name]: userText }; 
    setValues(newValues);
    setInputValue('');
    if (currentStep + 1 < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(newValues);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md h-3/4 flex flex-col">
        <div ref={containerRef} className="flex-1 p-4 overflow-y-auto space-y-2">
          {messages.map((msg, idx) => (
            <div key={idx} className={`text-sm ${msg.role === 'bot' ? 'text-blue-600' : 'text-gray-800'} `}>
              <span className="font-semibold">{msg.role === 'bot' ? 'Bot:' : 'You:'} </span>
              {msg.text}
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex">
          <input
            type="text"
            className="flex-1 border rounded p-2 mr-2"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your response..."
          />
          <button onClick={handleSend} className="bg-blue-600 text-white px-4 py-2 rounded">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
