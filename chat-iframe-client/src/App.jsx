import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { useChat } from 'ai/react';
import { ScrollArea } from './ui/scroll-area';
import './styles.css'; // S'assurer que le fichier de styles est importé
// import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

// Import dynamique des composants lourds
const Markdown = lazy(() => import('./ui/markdown'));
const ToolInvocation = lazy(() => import('./ui/toolInvocation'));

function formatMessage(message) {
  if (message.role === 'user') {
    return {
      icon: '👤',
      label: 'Utilisateur',
      text: message.content,
    };
  }

  if (message.role === 'assistant') {
    // Vérifier si le message a des parts (nouveau format)
    if (message.parts && Array.isArray(message.parts)) {
      // Construire le contenu à partir des parts
      const partsContent = message.parts
        .map((part) => {
          if (part.type === 'text') {
            return part.text;
          } else if (part.type === 'tool-invocation') {
            const toolInfo = part.toolInvocation;
            // On filtre seulement le texte mais on garde l'indication de l'outil
            if (toolInfo.result && toolInfo.result.save === false) {
              return `[Outil: ${toolInfo.toolName} - Résultat masqué pour ne pas encombrer la conversation. Si besoin, vous pouvez re faire l'appel de l'outil.]`;
            }
            return `[Outil: ${toolInfo.toolName}${toolInfo.state === 'result' ? ' - Terminé' : ' - En cours...'}]`;
          }
          return '';
        })
        .join('\n\n');

      return {
        icon: '🤖',
        label: 'Assistant',
        text: partsContent || message.content,
      };
    }

    // Ancien format (sans parts)
    if (!message.content || message.content.trim() === '') {
      return {
        icon: '🤖',
        label: 'Assistant',
        text: "⏳ L'assistant réfléchit et prépare un appel d'outil...",
      };
    }

    return {
      icon: '🤖',
      label: 'Assistant',
      text: message.content,
    };
  }

  if (message.role === 'tool') {
    try {
      const parsed = JSON.parse(message.content);
      // Filtrer seulement le texte pour les outils avec save=false
      if (parsed.save === false) {
        return {
          icon: '🛠',
          label: `Tool: ${message.name || 'outil'}`,
          text: "[Résultat masqué pour ne pas encombrer la conversation. Si besoin, vous pouvez re faire l'appel de l'outil.]",
        };
      }
      return {
        icon: '🛠',
        label: `Tool: ${message.name || 'outil'}`,
        text: parsed.text || JSON.stringify(parsed, null, 2),
      };
    } catch {
      return {
        icon: '🛠',
        label: `Tool: ${message.name || 'outil'}`,
        text: message.content,
      };
    }
  }

  return {
    icon: '❓',
    label: message.role,
    text: message.content,
  };
}

export default function App() {
  const [projectId, setProjectId] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [initialMessage, setInitialMessage] = useState(null);
  const [apiUrl, setApiUrl] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const extractedProjectId = pathParts[pathParts.length - 1];
    const urlParams = new URLSearchParams(window.location.search);
    const extractedApiKey = urlParams.get('apiKey');
    const extractedMessage = urlParams.get('message');

    setProjectId(extractedProjectId);
    setApiKey(extractedApiKey);
    setInitialMessage(extractedMessage);
    setApiUrl(`/chat/${extractedProjectId}/message?apiKey=${extractedApiKey}`);
  }, []);

  // Fonction pour nettoyer les messages qui ont save à false
  const cleanMessagesWithSaveFalse = (messages) => {
    return messages.map(message => {
      // Cloner le message pour éviter de modifier l'original
      const messageCopy = { ...message };

      // Traiter les messages d'assistant avec parts
      if (message.role === 'assistant' && message.parts && Array.isArray(message.parts)) {
        messageCopy.parts = message.parts.map(part => {
          // Si c'est une invocation d'outil avec save=false, nettoyer le résultat
          if (part.type === 'tool-invocation' &&
              part.toolInvocation &&
              part.toolInvocation.result &&
              part.toolInvocation.result.save === false) {
            return {
              ...part,
              toolInvocation: {
                ...part.toolInvocation,
                result: {
                  ...part.toolInvocation.result,
                  text: "[Résultat masqué pour ne pas encombrer la conversation. Si besoin, vous pouvez re faire l'appel de l'outil.]", // Remplacer par un message plutôt que vider
                },
              }
            };
          }
          return part;
        });
      }

      // Traiter les toolInvocations au niveau racine
      if (message.toolInvocations && Array.isArray(message.toolInvocations)) {
        messageCopy.toolInvocations = message.toolInvocations.map(tool => {
          if (tool.result && tool.result.save === false) {
            return {
              ...tool,
              result: {
                ...tool.result,
                text: "[Résultat masqué pour ne pas encombrer la conversation. Si besoin, vous pouvez re faire l'appel de l'outil.]", // Remplacer par un message plutôt que vider
              },
            };
          }
          return tool;
        });
      }

      // Traiter les messages d'outil avec save=false
      if (message.role === 'tool') {
        try {
          const content = JSON.parse(message.content);
          if (content.save === false) {
            messageCopy.content = JSON.stringify({
              ...content,
              text: "[Résultat masqué pour ne pas encombrer la conversation. Si besoin, vous pouvez re faire l'appel de l'outil.]", // Remplacer par un message plutôt que vider
            });
          }
        } catch (e) {
          // Si le parsing échoue, on ne modifie pas le contenu
        }
      }

      return messageCopy;
    });
  };

  // Récupérer les messages sauvegardés au chargement et les nettoyer
  const savedMessages =
    typeof sessionStorage !== 'undefined'
      ? cleanMessagesWithSaveFalse(JSON.parse(sessionStorage.getItem('chatMessages') || '[]'))
      : [];

  const {
    messages,
    input: inputValue,
    handleInputChange,
    handleSubmit,
    append: originalAppend,
    isLoading,
    setMessages,
  } = useChat({
    api: apiUrl,
    initialMessages: savedMessages,
  });

  // Surcharger la fonction append pour nettoyer les messages avant de les ajouter
  const append = (message) => {
    // Si c'est un message utilisateur, on l'ajoute directement
    if (message.role === 'user') {
      originalAppend(message);
      return;
    }

    // Sinon, on nettoie d'abord le message
    const cleanedMessage = cleanMessagesWithSaveFalse([message])[0];
    originalAppend(cleanedMessage);
  };

  useEffect(() => {
    if (!isLoading && messages) {
      const cleanedMessages = cleanMessagesWithSaveFalse(messages);
      sessionStorage.setItem('chatMessages', JSON.stringify(cleanedMessages));
      setMessages(cleanedMessages);
    }
  }, [messages, isLoading]);

  // Fonction pour effacer la conversation et le sessionStorage
  const clearConversation = () => {
    setShowClearConfirm(true);
  };

  // Fonctions pour gérer la confirmation
  const confirmClear = () => {
    sessionStorage.removeItem('chatMessages');
    setMessages([]);
    setShowClearConfirm(false);
  };

  const cancelClear = () => {
    setShowClearConfirm(false);
  };

  // Améliorer le défilement pour qu'il soit plus fluide
  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  // Effet pour le défilement qui dépend de messages - maintenant après la déclaration de useChat
  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 1000);
  }, [messages]);

  // Envoie automatique du message initial (si présent dans l'URL)
  useEffect(() => {
    if (initialMessage && apiUrl) {
      append({ role: 'user', content: initialMessage });
    }
  }, [initialMessage, append, apiUrl]);

  // Cette fonction analyse la structure des messages pour l'afficher
  useEffect(() => {
    if (messages.length > 0) {
      // Si nous avons au moins un message d'assistant et un message d'outil
      const assistantMessages = messages.filter((m) => m.role === 'assistant');
      const toolMessages = messages.filter((m) => m.role === 'tool');

      // Analyser la séquence avec le nouveau format (parts)
      let toolInvocations = [];

      // Extraire toutes les invocations d'outils des messages d'assistant
      assistantMessages.forEach((msg) => {
        if (msg.parts && Array.isArray(msg.parts)) {
          const toolParts = msg.parts.filter(
            (part) => part.type === 'tool-invocation',
          );
          if (toolParts.length > 0) {
            toolInvocations = [
              ...toolInvocations,
              ...toolParts.map((part) => part.toolInvocation),
            ];
          }
        }
        // Vérifier aussi toolInvocations au niveau racine
        if (msg.toolInvocations && Array.isArray(msg.toolInvocations)) {
          toolInvocations = [...toolInvocations, ...msg.toolInvocations];
        }
      });

      // Si nous avons des invocations d'outils
      if (toolInvocations.length > 0) {
        // Représentation de la séquence complète
        let sequence = '';
        messages.forEach((msg) => {
          if (msg.role === 'user') {
            sequence += '👤 User → ';
          } else if (msg.role === 'assistant') {
            sequence += '🤖 Assistant ';
            // Ajouter les outils si présents
            if (msg.parts && Array.isArray(msg.parts)) {
              const toolParts = msg.parts.filter(
                (part) => part.type === 'tool-invocation',
              );
              if (toolParts.length > 0) {
                toolParts.forEach((part) => {
                  sequence += `[🛠 ${part.toolInvocation.toolName}] `;
                });
              }
            }
            sequence += '→ ';
          } else if (msg.role === 'tool') {
            sequence += `🛠 Tool(${msg.name || 'unknown'}) → `;
          }
        });
        // Enlever la dernière flèche
        sequence = sequence.replace(/→ $/, '');
      }
    }
  }, [messages]);

  // Ajouter la fonction pour envoyer le message
  const handleSendMessage = () => {
    if (inputValue.trim() && !isLoading) {
      handleSubmit(new Event('submit'));
    }
  };

  // Calculer si l'input est désactivé
  const inputDisabled =
    isLoading || !projectId || !apiKey || !inputValue.trim();

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-stone-100">
      {showClearConfirm && (
        <div className="fixed inset-0 bg-stone-700/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-4 max-w-xs w-full text-center">
            <p className="mb-3 text-sm">
              Êtes-vous sûr de vouloir effacer toute la conversation ?
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={cancelClear}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={confirmClear}
                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm cursor-pointer"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full h-full p-0 relative flex flex-col">
        {/* Remplacer la div avec overflow-y-auto par ScrollArea */}
        <ScrollArea className="w-full h-full flex-1 pb-8">
          <div className="flex flex-col h-full">
            {messages?.length === 0 ? (
              <div className="flex items-center justify-center h-screen text-gray-400 italic">
                Démarrez une conversation en posant une question...
              </div>
            ) : (
              <div className="flex flex-col pb-[30%] text-sm">
                {messages.map((m, i) => {
                  const { icon, label, text } = formatMessage(m);

                  return (
                    <div
                      key={i}
                      className={`mb-1 p-3 ${
                        m.role === 'user'
                          ? 'flex justify-end'
                          : 'flex justify-start'
                      }`}
                    >
                      <div
                        className={`text-sm ${
                          m.role === 'user'
                            ? 'message-bubble p-2 pl-4 inline-block max-w-[60%] break-words shadow-sm text-sm mb-1.5 user-message bg-blue-600 ml-auto text-white text-left'
                            : 'bg-transparent w-full'
                        }`}
                      >
                        {m.role === 'assistant' &&
                        m.parts &&
                        Array.isArray(m.parts) ? (
                          <div>
                            {m.parts.map((part, partIndex) => {
                              if (part.type === 'text') {
                                return (
                                  <Suspense fallback={<Loading />} key={`text-${partIndex}`}>
                                    <Markdown>{part.text}</Markdown>
                                  </Suspense>
                                );
                              } else if (part.type === 'tool-invocation') {
                                return (
                                  <Suspense fallback={<Loading />} key={`tool-${partIndex}`}>
                                    <ToolInvocation
                                      toolInfo={part.toolInvocation}
                                    />
                                  </Suspense>
                                );
                              } else if (part.type === 'reasoning') {
                                return (
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center border border-stone-200 gap-1 text-sm text-stone-300 bg-stone-800 rounded-2xl py-0.5 px-2.5 max-w-max">
                                      <span className="text-white">🧠</span>
                                      Réflexion
                                    </div>
                                    <Suspense fallback={<Loading />} key={`reasoning-${partIndex}`}>
                                      { part.details.map(detail =>
                                        detail.type === 'text' ? <Markdown>{detail.text}</Markdown> : <>...</>
                                      )}
                                    </Suspense>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        ) : (
                          <div
                            className={
                              m.role === 'assistant' ? 'max-w-none' : ''
                            }
                          >
                            {m.role === 'assistant' ? (
                              <Suspense fallback={<Loading />}>
                                <Markdown>{text}</Markdown>
                              </Suspense>
                            ) : (
                              text
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Indicateur de frappe quand isLoading est true */}
                {isLoading && (
                  <div className="flex justify-start p-3 mb-1">
                    <div className="bg-transparent p-3">
                      <div className="typing-indicator">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Nouveau design d'input - position absolue en bas */}
        <div className="pb-2 flex justify-center space-x-2 w-full fixed bottom-0 left-0 right-0 shadow-md">
          <div className="w-full px-2 flex relative pt-2">
            <div className="flex w-full items-center bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden relative pr-[3px] pl-[3px]">
              {/* Bouton de suppression */}
              {messages.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="absolute left-[7px] bottom-[7px] bg-white border border-red-500 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl px-2 py-1 text-sm flex items-center justify-center z-10 cursor-pointer"
                  title="Effacer la conversation"
                >
                  Effacer la conversation
                </button>
              )}

              <textarea
                className={`w-full pl-[7px] pr-14 py-3 focus:outline-none resize-none min-h-[84px] max-h-[200px] overflow-y-auto text-sm border-0 ${messages.length > 0 ? 'pb-[35px]' : ''}`}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Écrivez votre message..."
                disabled={isLoading || !projectId || !apiKey}
                rows={3}
                ref={textareaRef}
              />

              <button
                className={`absolute right-[7px] bottom-[7px] rounded-full cursor-pointer h-9 w-9 flex items-center justify-center ${inputDisabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                onClick={handleSendMessage}
                disabled={inputDisabled}
                aria-label="Envoyer"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant de chargement
const Loading = () => (
  <div className="p-2 text-gray-400">Chargement...</div>
);
