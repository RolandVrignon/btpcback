import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';
import remarkBreaks from 'remark-breaks';
import remarkToc from 'remark-toc';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';

function App() {
  // États
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

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
    } else if (extractedProjectId && extractedApiKey) {
      // Ajouter un message de bienvenue avec des exemples de formatage
      setMessages([
        {
          content: `# Bienvenue dans le Chat du Projet

Vous pouvez utiliser ce chat pour poser des questions sur le projet.

## Fonctionnalités du chat

- Support complet de **Markdown**
- Formatage de code avec coloration syntaxique
- Tables et tableaux
- Formules mathématiques avec KaTeX
- Et bien plus encore!

### Exemples

Voici une formule mathématique: $E = mc^2$

\`\`\`javascript
// Voici un exemple de code JavaScript
function hello() {
  console.log("Bonjour le monde!");
}
\`\`\`

| Nom | Description |
| --- | ----------- |
| Projet | Données du projet |
| Chat | Interface de communication |

> Vous pouvez commencer à poser vos questions maintenant.

:smile: Bonne journée!
`,
          isUser: false
        }
      ]);
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

  // Fonction pour ajuster la hauteur du textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
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

    // Réinitialiser la hauteur du textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Fonction pour gérer les changements de l'input
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    adjustTextareaHeight();
  };

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-hidden relative">


      {/* Messages - zone scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 pb-24">
        {messages.length === 0 ? (
          <p className="text-center py-8">Pas de messages. Commencez la conversation!</p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`message-bubble p-4 rounded-lg max-w-[85%] break-words shadow-sm ${
                msg.isUser
                  ? 'user-message bg-blue-600 ml-auto text-white text-right'
                  : 'ai-message bg-slate-100 mr-auto text-slate-800 text-left'
              }`}
            >
              {msg.isUser ? (
                msg.content
              ) : (
                <div className="prose prose-blue max-w-none prose-headings:font-bold prose-p:my-4 prose-li:my-1 prose-headings:mt-6 prose-headings:mb-4 prose-table:my-4 text-slate-800">
                  <ReactMarkdown
                    remarkPlugins={[
                      remarkGfm,
                      remarkMath,
                      remarkEmoji,
                      remarkBreaks,
                      [remarkToc, { tight: true, ordered: true }]
                    ]}
                    rehypePlugins={[
                      rehypeRaw,
                      rehypeSlug,
                      rehypeSanitize,
                      rehypeKatex,
                      rehypeHighlight,
                      [
                        rehypeExternalLinks,
                        { target: "_blank", rel: ["nofollow", "noopener", "noreferrer"] }
                      ]
                    ]}
                    components={{
                      // Titres avec différentes tailles et styles
                      h1: ({ ...props }) => (
                        <h1
                          className="text-xl font-semibold my-6 pb-2 border-b"
                          {...props}
                        />
                      ),
                      h2: ({ ...props }) => (
                        <h2
                          className="text-md font-semibold my-5 "
                          {...props}
                        />
                      ),
                      h3: ({ ...props }) => (
                        <h3
                          className="text-md font-semibold my-4 "
                          {...props}
                        />
                      ),
                      h4: ({ ...props }) => (
                        <h4
                          className="text-base font-semibold my-3 "
                          {...props}
                        />
                      ),
                      h5: ({ ...props }) => (
                        <h5
                          className="text-sm font-semibold my-2 "
                          {...props}
                        />
                      ),
                      h6: ({ ...props }) => (
                        <h6 className="text-sm font-medium my-2 " {...props} />
                      ),

                      // Paragraphes et texte
                      p: ({ ...props }) => (
                        <p className="my-4 text-inherit leading-relaxed" {...props} />
                      ),
                      strong: ({ ...props }) => (
                        <strong className="font-bold text-inherit" {...props} />
                      ),
                      em: ({ ...props }) => (
                        <em className="italic text-inherit" {...props} />
                      ),

                      // Listes
                      ul: ({ ...props }) => (
                        <ul className="my-4 pl-6 list-disc space-y-2" {...props} />
                      ),
                      ol: ({ ...props }) => (
                        <ol className="my-4 pl-6 list-decimal space-y-2" {...props} />
                      ),
                      li: ({ ...props }) => <li className="my-1 pl-1" {...props} />,

                      // Tableaux
                      table: ({ ...props }) => (
                        <div className="overflow-x-auto my-6 rounded-md border border-gray-200">
                          <table className="border-collapse w-full" {...props} />
                        </div>
                      ),
                      th: ({ ...props }) => (
                        <th
                          className="border border-gray-300 bg-gray-100 p-3 font-semibold text-left "
                          {...props}
                        />
                      ),
                      td: ({ ...props }) => (
                        <td
                          className="border border-gray-300 p-3 "
                          {...props}
                        />
                      ),

                      // Autres éléments
                      blockquote: ({ ...props }) => (
                        <blockquote
                          className="border-l-4 border-blue-500 pl-4 py-1 my-4 bg-blue-50 rounded-r-md italic "
                          {...props}
                        />
                      ),
                      code: ({ ...props }) => (
                        <code
                          className="bg-gray-100 text-red-500 px-1 py-0.5 rounded text-sm font-mono"
                          {...props}
                        />
                      ),
                      pre: ({ ...props }) => (
                        <pre
                          className="bg-gray-800  p-4 rounded-md overflow-x-auto my-4 text-sm font-mono"
                          {...props}
                        />
                      ),
                      a: ({ ...props }) => (
                        <a
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                          {...props}
                        />
                      ),
                      hr: ({ ...props }) => (
                        <hr className="my-6 border-t border-gray-300" {...props} />
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              )}
              {!msg.isUser && index === messages.length - 1 && isTyping && (
                <div className="inline-flex items-center mt-2">
                  <span className="text-xs text-slate-500 mr-2">En cours...</span>
                  <span className="flex space-x-1">
                    <span className="inline-block h-1.5 w-1.5 bg-slate-400 rounded-full animate-pulse"></span>
                    <span className="inline-block h-1.5 w-1.5 bg-slate-500 rounded-full animate-pulse delay-150"></span>
                    <span className="inline-block h-1.5 w-1.5 bg-slate-600 rounded-full animate-pulse delay-300"></span>
                  </span>
                </div>
              )}
            </div>
          ))
        )}
        {isTyping && messages.length > 0 && messages[messages.length - 1].isUser && (
          <div className="flex flex-col items-start py-3 px-4 bg-slate-100 rounded-xl shadow-sm w-auto inline-block">
            <div className="text-xs text-slate-500 mb-2 font-medium">Assistant est en train d'écrire...</div>
            <div className="flex space-x-1">
              <div className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></div>
              <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
              <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse delay-300"></div>
              <div className="h-2 w-2 bg-blue-700 rounded-full animate-pulse delay-500"></div>
              <div className="h-2 w-2 bg-blue-800 rounded-full animate-pulse delay-700"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Saisie du message - fixe en bas */}
      <div className="pb-4 bg-white flex justify-center space-x-2 w-full absolute bottom-0 left-0 right-0 shadow-md">
        <div className="w-full max-w-4xl px-4 flex relative">
          <textarea
            className="w-full border border-gray-300 rounded-full px-5 py-3 focus:outline-none focus:ring-1 focus:ring-gray-400 pr-12 resize-none min-h-[48px] max-h-[150px] overflow-y-auto"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Écrivez votre message..."
            disabled={isTyping || !projectId || !apiKey}
            rows={1}
            ref={textareaRef}
          />
          <button
            className="absolute right-6 top-6 bg-black text-white p-2 rounded-full hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed h-9 w-9 flex items-center justify-center"
            onClick={handleSendMessage}
            disabled={isTyping || !inputValue.trim() || !projectId || !apiKey}
            aria-label="Envoyer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;