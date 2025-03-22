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
import { ScrollArea } from './ui/scroll-area';

function App() {
  // États
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Fonction pour scroller automatiquement vers le dernier message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Effet pour scroller lorsque les messages changent
  useEffect(() => {
    scrollToBottom();

    // Sauvegarder les messages dans le localStorage quand ils changent
    if (projectId && messages.length > 0) {
      localStorage.setItem(`chat_history_${projectId}`, JSON.stringify(messages));
    }
  }, [messages, projectId]);

  // Effet pour extraire les paramètres d'URL
  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const extractedProjectId = pathParts[pathParts.length - 1];

    const urlParams = new URLSearchParams(window.location.search);
    const extractedApiKey = urlParams.get('apiKey');
    const initialMessage = urlParams.get('message');

    setProjectId(extractedProjectId);
    setApiKey(extractedApiKey);

    // Essayer de récupérer l'historique du chat depuis le localStorage
    if (extractedProjectId) {
      const savedMessages = localStorage.getItem(`chat_history_${extractedProjectId}`);

      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages);
          setMessages(parsedMessages);
          return; // Ne pas continuer avec le message initial ou de bienvenue
        } catch (e) {
          console.error('Erreur lors du chargement de l\'historique:', e);
        }
      }
    }

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

  // Fonction pour effacer la conversation
  const clearConversation = () => {
    setShowClearConfirm(true);
  };

  // Fonction pour confirmer l'effacement
  const confirmClear = () => {
    setMessages([]);
    // Supprimer également du localStorage
    if (projectId) {
      localStorage.removeItem(`chat_history_${projectId}`);
    }
    setShowClearConfirm(false);
  };

  // Fonction pour annuler l'effacement
  const cancelClear = () => {
    setShowClearConfirm(false);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-stone-100 text-gray-800 font-sans relative text-xs">
      {/* Zone des messages avec défilement */}
      <ScrollArea className="flex flex-col p-2 pb-8">
        <div className="flex flex-col gap-6 pb-[40%]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              <p>Démarrez la conversation en posant une question</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.isUser
                    ? 'message-bubble p-2 rounded-lg inline-block max-w-[60%] break-words shadow-sm text-xs mb-1.5 user-message bg-blue-600 ml-auto text-white text-right'
                    : 'w-full text-xs mb-1.5 ai-message mr-auto text-slate-800 text-left'
                }`}
              >
                {msg.isUser ? (
                  msg.content
                ) : (
                  <div className="prose prose-blue max-w-none prose-xs prose-headings:font-bold prose-p:my-1.5 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-table:my-1.5 text-slate-800">
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
                            className="text-base font-semibold my-3 pb-1 border-b"
                            {...props}
                          />
                        ),
                        h2: ({ ...props }) => (
                          <h2
                            className="text-sm font-semibold my-2"
                            {...props}
                          />
                        ),
                        h3: ({ ...props }) => (
                          <h3
                            className="text-xs font-semibold my-1.5"
                            {...props}
                          />
                        ),
                        h4: ({ ...props }) => (
                          <h4
                            className="text-xs font-semibold my-1.5"
                            {...props}
                          />
                        ),
                        h5: ({ ...props }) => (
                          <h5
                            className="text-xs font-semibold my-1"
                            {...props}
                          />
                        ),
                        h6: ({ ...props }) => (
                          <h6 className="text-xs font-medium my-1" {...props} />
                        ),

                        // Paragraphes et texte
                        p: ({ ...props }) => (
                          <p className="my-1.5 text-inherit leading-relaxed text-xs" {...props} />
                        ),
                        strong: ({ ...props }) => (
                          <strong className="font-bold text-inherit" {...props} />
                        ),
                        em: ({ ...props }) => (
                          <em className="italic text-inherit" {...props} />
                        ),

                        // Listes
                        ul: ({ ...props }) => (
                          <ul className="my-1.5 pl-4 list-disc space-y-0.5" {...props} />
                        ),
                        ol: ({ ...props }) => (
                          <ol className="my-1.5 pl-4 list-decimal space-y-0.5" {...props} />
                        ),
                        li: ({ ...props }) => <li className="my-0.5 pl-1" {...props} />,

                        // Tableaux
                        table: ({ ...props }) => (
                          <div className="overflow-x-auto my-2 rounded-md border border-gray-200">
                            <table className="border-collapse w-full text-xs" {...props} />
                          </div>
                        ),
                        th: ({ ...props }) => (
                          <th
                            className="border border-gray-300 bg-gray-100 p-1 font-semibold text-left"
                            {...props}
                          />
                        ),
                        td: ({ ...props }) => (
                          <td
                            className="border border-gray-300 p-1"
                            {...props}
                          />
                        ),

                        // Autres éléments
                        blockquote: ({ ...props }) => (
                          <blockquote
                            className="border-l-4 border-blue-500 pl-2 py-0.5 my-1.5 bg-blue-50 rounded-r-md italic text-xs"
                            {...props}
                          />
                        ),
                        code: ({ ...props }) => (
                          <code
                            className="bg-gray-100 text-red-500 px-1 py-0.5 rounded text-xs font-mono"
                            {...props}
                          />
                        ),
                        pre: ({ ...props }) => (
                          <pre
                            className="bg-gray-800 p-2 rounded-md overflow-x-auto my-1.5 text-xs font-mono"
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
                          <hr className="my-3 border-t border-gray-300" {...props} />
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
                {!msg.isUser && index === messages.length - 1 && isTyping && (
                  <div className="inline-flex items-center mt-1">
                    <span className="text-[10px] text-slate-500 mr-1">En cours...</span>
                    <span className="flex space-x-0.5">
                      <span className="inline-block h-1 w-1 bg-slate-400 rounded-full animate-pulse"></span>
                      <span className="inline-block h-1 w-1 bg-slate-500 rounded-full animate-pulse delay-150"></span>
                      <span className="inline-block h-1 w-1 bg-slate-600 rounded-full animate-pulse delay-300"></span>
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
          {isTyping && messages.length > 0 && messages[messages.length - 1].isUser && (
            <div className="flex flex-col items-start py-1.5 px-2 bg-slate-100 rounded-xl shadow-sm w-auto inline-block text-[10px]">
              <div className="text-[10px] text-slate-500 mb-1 font-medium">Assistant est en train d'écrire...</div>
              <div className="flex space-x-0.5">
                <div className="h-1 w-1 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="h-1 w-1 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                <div className="h-1 w-1 bg-blue-600 rounded-full animate-pulse delay-300"></div>
                <div className="h-1 w-1 bg-blue-700 rounded-full animate-pulse delay-500"></div>
                <div className="h-1 w-1 bg-blue-800 rounded-full animate-pulse delay-700"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Modal de confirmation pour effacer la conversation */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-stone-700/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs w-full text-center">
            <p className="mb-3 text-xs">Êtes-vous sûr de vouloir effacer toute la conversation ?</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={cancelClear}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-xs"
              >
                Annuler
              </button>
              <button
                onClick={confirmClear}
                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saisie du message - fixe en bas */}
      <div className="pb-2 flex justify-center space-x-2 w-full fixed bottom-0 left-0 right-0 shadow-md">
        <div className="w-full px-2 flex relative pt-2">
          <div className="flex w-full items-center bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden relative pr-[3px] pl-[3px]">
            {/* Bouton de suppression */}
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="absolute left-[7px] bottom-[7px] bg-white border border-red-500 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl px-2 py-1 text-xs flex items-center justify-center z-10 cursor-pointer"
                title="Effacer la conversation"
              >
                Effacer la conversation
              </button>
            )}

            <textarea
              className={`w-full pl-[7px] pr-14 py-3 focus:outline-none resize-none min-h-[84px] max-h-[200px] overflow-y-auto text-xs border-0 ${messages.length > 0 ? 'pb-[35px]' : ''}`}
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
              rows={3}
              ref={textareaRef}
            />

            <button
              className={`absolute right-[7px] bottom-[7px] ${inputValue.trim() ? 'bg-black hover:bg-gray-800' : 'bg-gray-300 hover:bg-gray-400'} text-white rounded-full disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer h-9 w-9 flex items-center justify-center`}
              onClick={handleSendMessage}
              disabled={isTyping || !inputValue.trim() || !projectId || !apiKey}
              aria-label="Envoyer"
            >
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;