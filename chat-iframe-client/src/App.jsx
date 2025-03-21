import React, { useState, useEffect, useRef } from 'react';

function App() {
  // États
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const messagesEndRef = useRef(null);

  // Fonction pour scroller automatiquement vers le dernier message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Effet pour scroller lorsque les messages changent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      setMessages([{ content: initialMessage, isUser: true }]);
      sendMessage(initialMessage, extractedProjectId, extractedApiKey);
    }
  }, []);

  // Fonction pour envoyer un message au serveur
  const sendMessage = async (message, projId, key) => {
    try {
      setIsTyping(true);

      // Construire l'URL de l'API avec les paramètres
      const apiUrl = `/chat/${projId}/message?apiKey=${key}`;
      console.log('Envoi de la requête à:', apiUrl);

      // Faire la requête en mode streaming
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message,
          conversationHistory: messages.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.content
          }))
        }),
      });

      console.log('Statut de la réponse:', response.status);
      console.log('Headers de la réponse:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Erreur de réponse:', {
          status: response.status,
          statusText: response.statusText,
          data: errorData
        });
        throw new Error(`Erreur: ${response.status} - ${errorData}`);
      }

      // Préparer l'objet pour la réponse du bot
      setMessages(prev => [...prev, { content: '', isUser: false }]);

      // Lire le stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let text = '';

      while (!done) {
        try {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;

          if (done) {
            console.log('Streaming terminé');
            break;
          }

          // Décoder le chunk et l'ajouter au texte
          const chunk = decoder.decode(value, { stream: true });
          console.log('Chunk reçu:', chunk);

          // Analyser le chunk pour récupérer les données
          const lines = chunk.split('\n');
          let aiResponseText = '';

          for (const line of lines) {
            if (line.startsWith('data:')) {
              try {
                const data = JSON.parse(line.slice(5));
                console.log('Données JSON reçues:', data);
                if (data && data.text) {
                  aiResponseText += data.text || '';
                }
                if (data && data.error) {
                  console.error('Erreur reçue du serveur:', data.error);
                  throw new Error(data.error);
                }
              } catch (e) {
                console.warn('Erreur de parsing JSON:', e);
                // Continuer si ce n'est pas du JSON valide
              }
            }
          }

          text += aiResponseText;

          // Mettre à jour le dernier message (celui du bot)
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = text;
            return newMessages;
          });

          // Scroller vers le bas à chaque mise à jour
          scrollToBottom();
        } catch (streamError) {
          console.error('Erreur pendant la lecture du stream:', streamError);
          break;
        }
      }

      setIsTyping(false);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setMessages(prev => [...prev, {
        content: "Désolé, une erreur s'est produite lors de la communication avec le serveur.",
        isUser: false
      }]);
      setIsTyping(false);
    }
  };

  // Gérer l'envoi du message
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Ajouter le message de l'utilisateur
    setMessages(prevMessages => [
      ...prevMessages,
      { content: inputValue, isUser: true }
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
              className={`p-3 rounded-lg max-w-[80%] break-words ${
                msg.isUser
                  ? 'bg-blue-500 ml-auto text-white text-right'
                  : 'bg-stone-200 mr-auto text-black text-left'
              }`}
            >
              {msg.content}
              {!msg.isUser && index === messages.length - 1 && isTyping && (
                <span className="inline-block w-1.5 h-4 ml-1 bg-gray-500 animate-pulse" />
              )}
            </div>
          ))
        )}
        {isTyping && messages.length > 0 && messages[messages.length - 1].isUser && (
          <div className="flex space-x-2 items-center py-2 px-3 bg-stone-200 rounded-lg w-auto inline-block">
            <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce delay-75"></div>
            <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce delay-150"></div>
          </div>
        )}
        <div ref={messagesEndRef} />
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
          disabled={isTyping || !projectId || !apiKey}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          onClick={handleSendMessage}
          disabled={isTyping || !inputValue.trim() || !projectId || !apiKey}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}

export default App;