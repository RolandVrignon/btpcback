import React from 'react';

/**
 * Composant pour afficher les invocations d'outils comme un simple badge
 * @param {Object} props - Les propriétés du composant
 * @param {Object} props.toolInfo - Les informations sur l'outil
 */
export default function ToolInvocation({ toolInfo }) {

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm my-3 font-light ${
        toolInfo.state === 'result'
          ? 'bg-green-100 text-green-800'
          : 'bg-yellow-100 text-yellow-800'
      } mr-2 my-1`}
    >
      {toolInfo.state === 'result' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            strokeWidth="2"
            stroke="currentColor"
            fill="none"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12l3 3 6-6"
          />
        </svg>
      ) : (
        <svg
          className="animate-spin h-3 w-3 mr-1"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {toolInfo.toolName}
    </span>
  );
}