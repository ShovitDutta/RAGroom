import * as path from "path";
import { PdfParser } from "./pdf";
import { DocxParser } from "./docx";
import { TextParser } from "./text";
export interface IParser {
    parse(filePath: string): Promise<string>;
}
const BINARY_EXTENSIONS = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".tiff",
    ".ico",
    ".webp",
    ".mp3",
    ".wav",
    ".ogg",
    ".mp4",
    ".avi",
    ".mov",
    ".mkv",
    ".webm",
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
    ".exe",
    ".dll",
    ".so",
    ".app",
    ".bin",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".eot",
    ".pdf",
    ".docx",
    ".doc",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".sqlite",
    ".db",
]);
export function getParser(filePath: string): IParser | null {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === ".pdf") return new PdfParser();
    if (extension === ".docx") return new DocxParser();
    if (BINARY_EXTENSIONS.has(extension)) return null;
    return new TextParser();
}
