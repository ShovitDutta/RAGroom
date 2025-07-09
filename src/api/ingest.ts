import { Request, Response, NextFunction } from "express";
export const ingestFile = [
    (req: Request, res: Response, next: NextFunction): void => {
        next();
    },
];
