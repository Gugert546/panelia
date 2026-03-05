import React, { useState } from 'react';
import { sendMessageToAI } from './aiLogic';
import WidgetPane from '../features/Widgets/components/WidgetPane';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [input, setInput] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSend = async() => {
    if (input.trim()) {
      setMessages((prev) => [...prev, { sender: 'user', text: input }]);
      try {
        const aiResponse = await sendMessageToAI(input);
        setMessages((prev) => [...prev, { sender: 'ai', text: aiResponse.output_text }]);
      } catch (error) {
        console.error('Error sending message to AI:', error);
        setMessages((prev) => [...prev, { sender: 'ai', text: 'Sorry, something went wrong.' }]);
      }
      setInput('');
    }
  };

  return (
    <WidgetPane title="Chat">
      <div style={styles.chatWindow}>
        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              ...styles.message,
              alignSelf: message.sender === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor: message.sender === 'user' ? 'rgba(255, 255, 255, 0.93)' : 'rgba(229, 229, 234, 0.6)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {message.text}
          </div>
        ))}
      </div>
      <div style={styles.inputContainer}>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          style={styles.input}
        />
        <button onClick={handleSend} style={styles.sendButton}>
          Send
        </button>
      </div>
    </WidgetPane>
  );
};

const styles = {
  chatWindow: {
    width: '100%',
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '12px',
    gap: '8px',
    overflowY: 'auto' as const,
    minHeight: '300px',
  },
  message: {
    maxWidth: '85%',
    padding: '10px 14px',
    borderRadius: '16px',
    fontSize: '14px',
    lineHeight: '1.4',
  },
  inputContainer: {
    display: 'flex',
    gap: '8px',
    width: '100%',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    fontSize: '14px',
    border: 'none',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(8px)',
    color: 'inherit',
    outline: 'none',
  },
  sendButton: {
    padding: '10px 20px',
    fontSize: '14px',
    color: '#fff',
    backgroundColor: 'rgba(0, 123, 255, 0.8)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    transition: 'background-color 0.2s',
  },
};

export default Chat;