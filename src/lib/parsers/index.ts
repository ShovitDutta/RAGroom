import * as path from 'path';
import { TextParser } from './text';
import { PdfParser } from './pdf';
import { DocxParser } from './docx';

export interface IParser {
  parse(filePath: string): Promise<string>;
}

// A set of common binary file extensions to ignore.
const BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.ico', '.webp',
  // Audio/Video
  '.mp3', '.wav', '.ogg', '.mp4', '.avi', '.mov', '.mkv', '.webm',
  // Archives
  '.zip', '.rar', '.7z', '.tar', '.gz',
  // Executables/Binaries
  '.exe', '.dll', '.so', '.app', '.bin',
  // Fonts
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  // Other
  '.pdf', // Handled by its own parser
  '.docx', // Handled by its own parser
  '.doc',
  '.xls', '.xlsx',
  '.ppt', '.pptx',
  '.sqlite', '.db',
]);

/**
 * Gets the appropriate parser for a given file path.
 * It uses specific parsers for complex types (PDF, DOCX) and falls back
 * to a general text parser for any other non-binary file type.
 *
 * @param filePath The path to the file.
 * @returns An IParser instance or null if the file type is binary or unsupported.
 */
export function getParser(filePath: string): IParser | null {
  const extension = path.extname(filePath).toLowerCase();

  // Use specific parsers for complex formats first
  if (extension === '.pdf') {
    return new PdfParser();
  }
  if (extension === '.docx') {
    return new DocxParser();
  }

  // If the extension is in our binary list, ignore it.
  if (BINARY_EXTENSIONS.has(extension)) {
    return null;
  }

  // For all other extensions, assume it's a text-based file.
  // The TextParser will handle errors gracefully if it's not.
  return new TextParser();
}