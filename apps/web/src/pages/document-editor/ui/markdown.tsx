import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownProps = { source: string };

/**
 * A document's markdown as `prose.scss` styles it. `react-markdown` renders no
 * raw HTML, so a document cannot inject markup into the page.
 */
export function Markdown({ source }: MarkdownProps) {
  return (
    <div className="prose-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  );
}
