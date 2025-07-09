import * as fs from "fs/promises";
import { IParser } from "./index";
export class TextParser implements IParser {
    async parse(filePath: string): Promise<string> {
        try {
            const content = await fs.readFile(filePath, "utf-8");
            return content;
        } catch (error) {
            console.error(`Failed to parse text file: ${filePath}`, error);
            return "";
        }
    }
}
