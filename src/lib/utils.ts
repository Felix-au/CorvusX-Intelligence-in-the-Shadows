import React from "react"

export function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return "";
  
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
