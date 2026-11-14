/** `text` with the first of `marks` it contains set as a highlight (bold on the accent tint). */
export function Highlight({ text, marks }: { text: string; marks: readonly string[] }) {
  const mark = marks.find((phrase) => text.includes(phrase));
  if (!mark) return text;
  const at = text.indexOf(mark);
  return (
    <>
      {text.slice(0, at)}
      <strong className="highlight">{mark}</strong>
      {text.slice(at + mark.length)}
    </>
  );
}
