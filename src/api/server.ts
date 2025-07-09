import multer from "multer";
import * as dotenv from "dotenv";
import { ingestFile } from "./ingest";
import { chatWithDocument } from "./chat";
import express, { Express, Request, Response, NextFunction } from "express";
dotenv.config();
export const createApp = (): Express => {
    const app: Express = express();
    app.use(express.json());
    app.get("/health", (req: Request, res: Response) => {
        res.status(200).send("OK");
    });
    app.post("/ingest", ...ingestFile);
    app.post("/chat", ...chatWithDocument);
    app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
        console.error("[server]: An error occurred:", err);
        if (err instanceof multer.MulterError) {
            res.status(400).send(`File upload error: ${err.message}`);
            return;
        }
        if (err.message === "Only .zip files are allowed") {
            res.status(400).send(`Invalid file type: ${err.message}`);
            return;
        }
        if (!res.headersSent) res.status(500).send("An unexpected server error occurred.");
    });
    return app;
};
const port = process.env.PORT || 3000;
if (require.main === module) {
    const app = createApp();
    app.listen(port, () => console.log(`[server]: Server is running at http://localhost:${port}`));
}
