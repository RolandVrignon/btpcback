import React from 'react';

/**
 * Composant pour afficher les invocations d'outils comme un simple badge
 * @param {Object} props - Les propriétés du composant
 * @param {Object} props.toolInfo - Les informations sur l'outil
 */
export default function ToolInvocation({ toolInfo }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs my-3 font-medium ${
        toolInfo.state === 'result'
          ? 'bg-blue-100 text-blue-800'
          : 'bg-yellow-100 text-yellow-800'
      } mr-2 my-1`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3 w-3 mr-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      {toolInfo.toolName}
    </span>
  );
}