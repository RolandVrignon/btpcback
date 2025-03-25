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

export default function Markdown({ children }) {
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
            // Titres avec différentes tailles et styles
            h1: ({ ...props }) => (
              <h1
                className="text-lg font-semibold my-6 pb-1 border-b"
                {...props}
              />
            ),
            h2: ({ ...props }) => (
              <h2
                className="text-base font-semibold my-2"
                {...props}
              />
            ),
            h3: ({ ...props }) => (
              <h3
                className="text-sm font-semibold my-1.5"
                {...props}
              />
            ),
            h4: ({ ...props }) => (
              <h4
                className="text-sm font-semibold my-1.5"
                {...props}
              />
            ),
            h5: ({ ...props }) => (
              <h5
                className="text-sm font-semibold my-1"
                {...props}
              />
            ),
            h6: ({ ...props }) => (
              <h6 className="text-sm font-medium my-1" {...props} />
            ),

            // Paragraphes et texte
            p: ({ ...props }) => (
              <p className="my-1.5 text-inherit leading-normal text-sm" {...props} />
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
                <table className="border-collapse w-full text-sm" {...props} />
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
                className="border-l-4 border-blue-500 pl-2 py-0.5 my-1.5 bg-blue-50 rounded-r-md italic text-sm"
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
                className="bg-gray-800 p-2 rounded-md overflow-x-auto my-1.5 text-sm font-mono"
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
        {children}
      </ReactMarkdown>
    </div>
  );
}
