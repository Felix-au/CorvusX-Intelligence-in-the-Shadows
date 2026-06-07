import React from "react"
import { Copy, Check } from "lucide-react"

export function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

const CodeBlockComponent: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="my-2 rounded-lg border border-white/10 overflow-hidden bg-black/45 backdrop-blur-sm select-text font-mono text-[10px] text-gray-200 shadow-md">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3 py-1 bg-white/5 border-b border-white/10 select-none">
        <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[9px] text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 rounded px-1.5 py-0.5 transition-all cursor-pointer select-none"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-400" />
              <span className="text-green-400 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Pre block */}
      <pre className="p-3 overflow-x-auto whitespace-pre leading-relaxed select-text text-left">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function renderTextBlock(text: string): React.ReactNode {
  // Split text by newlines and render lines with breaks
  return text.split('\n').map((line, lineIdx, arr) => {
    const parts: React.ReactNode[] = [];
    
    // Regular expression to match bold (**text**), italic (*text*), and code (`text`)
    const tokenRegex = /(\*\*|__|\*|_|`)(.*?)\1/g;
    let match;
    let lastIndex = 0;
    
    while ((match = tokenRegex.exec(line)) !== null) {
      // Add plain text before match
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }
      
      const delimiter = match[1];
      const content = match[2];
      
      if (delimiter === '**' || delimiter === '__') {
        parts.push(React.createElement('strong', { key: `s-${match.index}` }, content));
      } else if (delimiter === '*' || delimiter === '_') {
        parts.push(React.createElement('em', { key: `e-${match.index}` }, content));
      } else if (delimiter === '`') {
        parts.push(React.createElement('code', { 
          key: `c-${match.index}`, 
          className: "px-1 py-0.5 bg-black/20 text-white/90 rounded font-mono text-[10px]" 
        }, content));
      }
      
      lastIndex = tokenRegex.lastIndex;
    }
    
    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }
    
    return React.createElement(React.Fragment, { key: lineIdx }, 
      ...parts,
      lineIdx < arr.length - 1 ? React.createElement('br', { key: `br-${lineIdx}` }) : null
    );
  });
}

export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return "";

  const blocks: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;
  let blockKey = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text block before the match
    const textBefore = text.substring(lastIndex, match.index);
    if (textBefore.length > 0) {
      blocks.push(
        React.createElement(
          React.Fragment,
          { key: `text-${blockKey++}` },
          renderTextBlock(textBefore)
        )
      );
    }

    const language = match[1] || "code";
    const codeContent = match[2];

    // Add code block
    blocks.push(
      React.createElement(CodeBlockComponent, {
        key: `code-${blockKey++}`,
        code: codeContent,
        language
      })
    );

    lastIndex = codeBlockRegex.lastIndex;
  }

  // Add remaining text
  const remainingText = text.substring(lastIndex);
  if (remainingText.length > 0) {
    blocks.push(
      React.createElement(
        React.Fragment,
        { key: `text-${blockKey++}` },
        renderTextBlock(remainingText)
      )
    );
  }

  return React.createElement(React.Fragment, null, ...blocks);
}
