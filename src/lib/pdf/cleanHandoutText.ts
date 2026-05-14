const loneNoisePattern = /^[\s.·•・。．,，;；:：\-–—_()[\]{}]+$/;

export function cleanHandoutPageText(input: string) {
  const rawLines = input
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(isUsefulLine);

  const blocks: string[] = [];
  let paragraph = "";

  const flushParagraph = () => {
    const text = paragraph.trim();
    if (text) blocks.push(text);
    paragraph = "";
  };

  for (const line of rawLines) {
    const listItem = toListItem(line);
    if (listItem) {
      flushParagraph();
      blocks.push(listItem);
      continue;
    }

    if (looksLikeHeading(line)) {
      flushParagraph();
      blocks.push(`### ${line}`);
      continue;
    }

    paragraph = paragraph ? joinFragments(paragraph, line) : line;
    if (shouldFlushParagraph(paragraph, line)) flushParagraph();
  }

  flushParagraph();
  return blocks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

function isUsefulLine(line: string) {
  if (!line) return false;
  if (loneNoisePattern.test(line)) return false;
  if (/^\d{1,3}$/.test(line)) return false;
  if (line.length <= 2 && !/[\p{L}\p{N}]/u.test(line)) return false;
  return true;
}

function toListItem(line: string) {
  const bullet = /^(?:[-*•·]|[0-9]{1,2}[.)、])\s*(.+)$/.exec(line);
  if (!bullet) return "";
  const body = bullet[1].trim();
  return body && !loneNoisePattern.test(body) ? `- ${body}` : "";
}

function looksLikeHeading(line: string) {
  if (line.length > 78) return false;
  if (/[。！？.!?]$/.test(line)) return false;
  if (/^(?:第\s*)?[0-9一二三四五六七八九十]+[章节、.)]\s*\S+/.test(line)) return true;
  if (/^[0-9]+(?:\.[0-9]+)+\s+\S+/.test(line)) return true;
  return line.length <= 34 && /[\u4e00-\u9fff]/.test(line) && !/[，,；;]/.test(line);
}

function shouldFlushParagraph(paragraph: string, line: string) {
  if (paragraph.length > 180) return true;
  return /[。！？!?]$/.test(line);
}

function joinFragments(left: string, right: string) {
  if (!left) return right;
  const needsSpace = /[A-Za-z0-9)]$/.test(left) && /^[A-Za-z0-9(]/.test(right);
  return `${left}${needsSpace ? " " : ""}${right}`;
}
