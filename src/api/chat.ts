import { Request, Response, NextFunction } from "express";
export const chatWithDocument = [
    (req: Request, res: Response, next: NextFunction): void => {
        res.status(200).json({ message: "ok" });
    },
];
