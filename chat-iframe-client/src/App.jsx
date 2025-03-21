import React, { useState, useEffect } from 'react';

function App() {
  // États
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [apiKey, setApiKey] = useState(null);

  // Effet pour extraire les paramètres d'URL
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const extractedProjectId = pathParts[pathParts.length - 1];

    const urlParams = new URLSearchParams(window.location.search);
    const extractedApiKey = urlParams.get('apiKey');
    const initialMessage = urlParams.get('message');

    setProjectId(extractedProjectId);
    setApiKey(extractedApiKey);

    // Si un message initial est fourni et que les identifiants sont valides
    if (initialMessage && extractedProjectId && extractedApiKey) {
      setMessages([{ text: initialMessage, isUser: true }]);
      sendMessage(initialMessage, extractedProjectId, extractedApiKey);
    }
  }, []);

  // Fonction pour envoyer un message
  const sendMessage = async (message, projId, key) => {
    if (!message.trim() || !projId || !key) return;

    setLoading(true);

    try {
      const response = await fetch(`/chat/${projId}/message?apiKey=${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationHistory: messages.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Ajouter la réponse aux messages
      setMessages(prevMessages => [
        ...prevMessages,
        { text: data.response || data.message || "Pas de réponse", isUser: false }
      ]);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { text: "Désolé, une erreur s'est produite lors de l'envoi du message.", isUser: false }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Gérer l'envoi du message
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Ajouter le message de l'utilisateur
    setMessages(prevMessages => [
      ...prevMessages,
      { text: inputValue, isUser: true }
    ]);

    // Envoyer le message au serveur
    sendMessage(inputValue, projectId, apiKey);

    // Réinitialiser le champ de saisie
    setInputValue('');
  };

  return (
    <div className="chat-container h-full w-full bg-green-500">
      {/* Informations de connexion */}
      <div className="connection-info">
        {projectId && apiKey ? (
          <p style={{ color: 'green' }}>Connecté au projet: {projectId}</p>
        ) : (
          <p style={{ color: 'red' }}>
            Paramètres manquants. URL attendue: /chat/[projectId]?apiKey=[apiKey]
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <p className="empty-chat">Pas de messages. Commencez la conversation!</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.isUser ? 'user' : 'ai'}`}
            >
              {msg.text}
            </div>
          ))
        )}
        {loading && (
          <div className="typing-indicator">
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
            <div className="typing-dot"></div>
          </div>
        )}
      </div>

      {/* Saisie du message */}
      <div className="input-area">
        <input
          type="text"
          className="message-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Écrivez votre message..."
          disabled={loading || !projectId || !apiKey}
        />
        <button
          className="send-button"
          onClick={handleSendMessage}
          disabled={loading || !inputValue.trim() || !projectId || !apiKey}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

export default App;