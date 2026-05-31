export function getCodeBlockProps(className: string | undefined) {
  const match = /language-(\w+)/.exec(className || "");
  return match ? { language: match[1] } : {};
}

export function formatCodeBlock(code: string, language: string | undefined) {
  if (!language) return code;
  return code;
}
