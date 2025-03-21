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
    <div className="h-full w-full bg-white flex flex-col">
      {/* Informations de connexion */}
      <div className="bg-white p-4 shadow-sm">
        {projectId && apiKey ? (
          <p className="text-green-600 text-sm">Connecté au projet: {projectId}</p>
        ) : (
          <p className="text-red-600 text-sm">
            Paramètres manquants. URL attendue: /chat/[projectId]?apiKey=[apiKey]
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Pas de messages. Commencez la conversation!</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${msg.isUser ? 'bg-blue-500 ml-auto text-white text-right' : 'bg-stone-200 text-black text-left'}`}
            >
              {msg.text}
            </div>
          ))
        )}
        {loading && (
          <div className="flex space-x-2 justify-center items-center py-2">
            <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
            <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
          </div>
        )}
      </div>

      {/* Saisie du message */}
      <div className="border-t border-gray-200 p-4 bg-white flex space-x-2">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Écrivez votre message..."
          disabled={loading || !projectId || !apiKey}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
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