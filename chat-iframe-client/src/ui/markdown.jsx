import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import remarkEmoji from 'remark-emoji';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeExternalLinks from 'rehype-external-links';
import remarkToc from 'remark-toc';

// Créer un composant mémorisé pour chaque type d'élément markdown
const MemoizedHeading1 = memo(({ children, ...props }) => (
  <h1 className="text-lg font-semibold my-6 pb-1 border-b" {...props}>
    {children}
  </h1>
));

const MemoizedHeading2 = memo(({ children, ...props }) => (
  <h2 className="text-base font-semibold my-2" {...props}>
    {children}
  </h2>
));

const MemoizedHeading3 = memo(({ children, ...props }) => (
  <h3 className="text-sm font-semibold my-1.5" {...props}>
    {children}
  </h3>
));

const MemoizedHeading4 = memo(({ children, ...props }) => (
  <h4 className="text-sm font-semibold my-1.5" {...props}>
    {children}
  </h4>
));

const MemoizedHeading5 = memo(({ children, ...props }) => (
  <h5 className="text-sm font-semibold my-1" {...props}>
    {children}
  </h5>
));

const MemoizedHeading6 = memo(({ children, ...props }) => (
  <h6 className="text-sm font-medium my-1" {...props}>
    {children}
  </h6>
));

const MemoizedParagraph = memo(({ children, ...props }) => (
  <p className="my-1.5 text-inherit leading-normal text-sm" {...props}>
    {children}
  </p>
));

const MemoizedStrong = memo(({ children, ...props }) => (
  <strong className="font-bold text-inherit" {...props}>
    {children}
  </strong>
));

const MemoizedEm = memo(({ children, ...props }) => (
  <em className="italic text-inherit" {...props}>
    {children}
  </em>
));

const MemoizedUl = memo(({ children, ...props }) => (
  <ul className="my-1.5 pl-4 list-disc space-y-0.5" {...props}>
    {children}
  </ul>
));

const MemoizedOl = memo(({ children, ...props }) => (
  <ol className="my-1.5 pl-4 list-decimal space-y-0.5" {...props}>
    {children}
  </ol>
));

const MemoizedLi = memo(({ children, ...props }) => (
  <li className="my-0.5 pl-1" {...props}>
    {children}
  </li>
));

const MemoizedTable = memo(({ children, ...props }) => (
  <div className="overflow-x-auto my-2 rounded-md border border-gray-200">
    <table className="border-collapse w-full text-sm" {...props}>
      {children}
    </table>
  </div>
));

const MemoizedTh = memo(({ children, ...props }) => (
  <th className="border border-gray-300 bg-gray-100 p-1 font-semibold text-left" {...props}>
    {children}
  </th>
));

const MemoizedTd = memo(({ children, ...props }) => (
  <td className="border border-gray-300 p-1" {...props}>
    {children}
  </td>
));

const MemoizedBlockquote = memo(({ children, ...props }) => (
  <blockquote className="border-l-4 border-blue-500 pl-2 py-0.5 my-1.5 bg-blue-50 rounded-r-md italic text-sm" {...props}>
    {children}
  </blockquote>
));

const MemoizedCode = memo(({ children, ...props }) => (
  <code className="bg-gray-100 text-red-500 px-1 py-0.5 rounded text-sm font-mono" {...props}>
    {children}
  </code>
));

const MemoizedPre = memo(({ children, ...props }) => (
  <pre className="bg-gray-800 p-2 rounded-md overflow-x-auto my-1.5 text-sm font-mono" {...props}>
    {children}
  </pre>
));

const MemoizedA = memo(({ children, ...props }) => (
  <a className="text-blue-600 hover:text-blue-800 hover:underline" {...props}>
    {children}
  </a>
));

const MemoizedHr = memo(({ ...props }) => (
  <hr className="my-3 border-t border-gray-300" {...props} />
));

// Composant Markdown principal mémorisé
const Markdown = memo(({ children }) => {
  return (
    <div className="prose prose-blue max-w-none prose-xs prose-headings:font-bold prose-p:my-1.5 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-table:my-1.5 text-slate-800">
      <ReactMarkdown
        remarkPlugins={[
          remarkGfm,
          remarkMath,
          remarkEmoji,
          remarkBreaks,
          [remarkToc, { tight: true, ordered: true }],
        ]}
        rehypePlugins={[
          rehypeRaw,
          rehypeSlug,
          rehypeSanitize,
          rehypeKatex,
          rehypeHighlight,
          [
            rehypeExternalLinks,
            {
              target: '_blank',
              rel: ['nofollow', 'noopener', 'noreferrer'],
            },
          ],
        ]}
        components={{
          h1: MemoizedHeading1,
          h2: MemoizedHeading2,
          h3: MemoizedHeading3,
          h4: MemoizedHeading4,
          h5: MemoizedHeading5,
          h6: MemoizedHeading6,
          p: MemoizedParagraph,
          strong: MemoizedStrong,
          em: MemoizedEm,
          ul: MemoizedUl,
          ol: MemoizedOl,
          li: MemoizedLi,
          table: MemoizedTable,
          th: MemoizedTh,
          td: MemoizedTd,
          blockquote: MemoizedBlockquote,
          code: MemoizedCode,
          pre: MemoizedPre,
          a: MemoizedA,
          hr: MemoizedHr,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => {
  // Fonction de comparaison personnalisée pour la mémorisation
  return prevProps.children === nextProps.children;
});

// Ajouter un displayName pour le débogage
Markdown.displayName = 'Markdown';

export default Markdown;
