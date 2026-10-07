import ReactMarkdown from "react-markdown";

type StorefrontRichTextFormat = "plain" | "markdown";

const allowedElements = [
  "p",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "br",
  "code",
  "pre",
];

function safeMarkdownUrl(value: string) {
  if (
    value !== value.trim() ||
    [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    }) ||
    value.includes("\\")
  )
    return "";

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:" ? value : "";
    } catch {
      return "";
    }
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith("//")) return "";
  return value;
}

export function StorefrontRichText({
  content,
  format = "plain",
}: {
  content: string;
  format?: StorefrontRichTextFormat;
}) {
  if (format === "plain") {
    return (
      <div className="storefront-rich-text">
        <p>{content}</p>
      </div>
    );
  }

  return (
    <div className="storefront-rich-text">
      <ReactMarkdown
        allowedElements={allowedElements}
        skipHtml
        urlTransform={(url, key) => (key === "href" ? safeMarkdownUrl(url) : "")}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
