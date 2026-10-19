import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Paragraph,
  Packer,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(scriptDirectory, '../..')

function inlineRuns(value) {
  const runs = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^\)]+\))/g
  let cursor = 0
  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) runs.push(new TextRun(value.slice(cursor, match.index)))
    const token = match[0]
    if (token.startsWith('**')) runs.push(new TextRun({ text: token.slice(2, -2), bold: true }))
    else if (token.startsWith('`')) runs.push(new TextRun({ text: token.slice(1, -1), font: 'Courier New' }))
    else {
      const link = token.match(/^\[([^\]]+)\]\(([^\)]+)\)$/)
      runs.push(new TextRun(link ? `${link[1]} (${link[2]})` : token))
    }
    cursor = match.index + token.length
  }
  if (cursor < value.length) runs.push(new TextRun(value.slice(cursor)))
  return runs.length ? runs : [new TextRun(value)]
}

function tableFromLines(lines) {
  const rows = lines
    .filter((line) => !/^\|\s*-/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length)
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, rowIndex) => new TableRow({
      children: cells.map((cell) => new TableCell({
        children: [new Paragraph({ children: inlineRuns(cell) })],
        shading: rowIndex === 0 ? { fill: 'E8EEE5' } : undefined,
      })),
    })),
  })
}

function markdownToBlocks(markdown) {
  const lines = markdown.split(/\r?\n/)
  const blocks = []
  let paragraphLines = []
  let codeLines = []
  let tableLines = []
  let inCode = false

  const flushParagraph = () => {
    if (paragraphLines.length) {
      blocks.push(new Paragraph({ children: inlineRuns(paragraphLines.join(' ')), spacing: { after: 120 } }))
      paragraphLines = []
    }
  }
  const flushTable = () => {
    if (tableLines.length) {
      blocks.push(tableFromLines(tableLines))
      tableLines = []
    }
  }
  const flushCode = () => {
    if (codeLines.length) {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: codeLines.join('\n'), font: 'Courier New', size: 18 })],
        shading: { fill: 'F1F3F0' },
        spacing: { after: 140 },
      }))
      codeLines = []
    }
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      flushParagraph(); flushTable()
      if (inCode) flushCode()
      inCode = !inCode
      continue
    }
    if (inCode) {
      codeLines.push(line)
      continue
    }
    if (line.startsWith('|')) {
      flushParagraph()
      tableLines.push(line)
      continue
    }
    flushTable()
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      const level = heading[1].length === 1 ? HeadingLevel.TITLE : heading[1].length === 2 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2
      blocks.push(new Paragraph({ text: heading[2], heading: level, spacing: { before: 220, after: 120 } }))
      continue
    }
    const bullet = line.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      flushParagraph()
      blocks.push(new Paragraph({ children: inlineRuns(bullet[1]), bullet: { level: 0 }, spacing: { after: 60 } }))
      continue
    }
    const numbered = line.match(/^\d+\.\s+(.+)$/)
    if (numbered) {
      flushParagraph()
      blocks.push(new Paragraph({ children: inlineRuns(numbered[1]), numbering: { reference: 'report-numbering', level: 0 }, spacing: { after: 60 } }))
      continue
    }
    if (!line.trim()) {
      flushParagraph()
      continue
    }
    paragraphLines.push(line.trim())
  }
  flushParagraph(); flushTable(); flushCode()
  return blocks
}

async function convert(sourceName, outputName) {
  const source = await readFile(path.join(repositoryRoot, 'docs', sourceName), 'utf8')
  const document = new Document({
    creator: 'Financial Data Warehouse project',
    title: sourceName.replace('.md', ''),
    description: 'Financial Data Warehouse project report',
    numbering: { config: [{ reference: 'report-numbering', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }] }] },
    sections: [{ properties: {}, children: markdownToBlocks(source) }],
  })
  const buffer = await Packer.toBuffer(document)
  await writeFile(path.join(repositoryRoot, 'docs', outputName), buffer)
}

await convert('FINAL_REPORT.md', 'FINAL_REPORT.docx')
await convert('PROJECT_REPORT.md', 'PROJECT_REPORT.docx')
console.log('Generated docs/FINAL_REPORT.docx and docs/PROJECT_REPORT.docx')
