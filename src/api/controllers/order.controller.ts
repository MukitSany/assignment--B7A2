import type { NextFunction, Request, Response } from "express";
import OrderIssues from "../services/order.service";
import { sendResponse } from "../../utils/sendResponse";
import authService from "../services/auth.service";
import orderService from "../services/order.service";


export const getAllIssues = async (req: Request, res: Response) => {
  const { sort, type, status } = req.query;
  const issues = await OrderIssues.getAllissues();
  sendResponse(res, {
    message: "Orders retrieved successfully",
    data: issues,
  });
};

export const createIssue = async (req: Request, res: Response, next:NextFunction) => {

  try {
    if (!req.user) {
      return sendResponse(res, { message: "Unauthorized", error: true }, 401);
    }
    
  
  const { title, description, type } = req.body;
  const reporter_id:any = req.user.id;

   if (!title || !description || !type) {
      return sendResponse(res, { message: "All fields are required", error: true }, 400);
    }

  const newissue = await OrderIssues.createIssue({
    reporter_id,
    title,
    description,
    type,
    status:"open",
  });
  sendResponse(res, {
    message: "Issue created successfully",
    data: newissue,
  });
  } catch (error) {
    next(error);
  }
};

export const getSingleIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return sendResponse(res, { message: "Invalid issue ID", error: true }, 400);
    }

    const issue = await orderService.getIssueById(id);

    if (!issue) {
      return sendResponse(res, { message: "Issue not found", error: true }, 404);
    }

    sendResponse(res, {
      message: "Issue retrieved successfullyyyy",
      data: issue,
    });
  } catch (error) {
    next(error);
  }
};



export const updateIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return sendResponse(res, { message: "Unauthorized", error: true }, 401);
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendResponse(res, { message: "Invalid issue ID", error: true }, 400);
    }

    const issue = await orderService.getIssueById(id);
    if (!issue) {
      return sendResponse(res, { message: "Issue not found", error: true }, 404);
    }

    const { role, id: userId } = req.user;

    if (role === "contributor") {
      if (issue.reporter.id !== userId) {
        return sendResponse(res, { message: "You can only update your own issues", error: true }, 403);
      }
      if (issue.status !== "open") {
        return sendResponse(res, { message: "You can only update open issues", error: true }, 403);
      }
    }

    const { title, description, type } = req.body;

    const updatedIssue = await orderService.updateIssue(id, { title, description, type });

    sendResponse(res, {
      message: "Issue updated successfully",
      data: updatedIssue,
    });
  } catch (error) {
    next(error);
  }
};


export const deleteIssue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return sendResponse(res, { message: "Unauthorized", error: true }, 401);
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendResponse(res, { message: "Invalid issue ID", error: true }, 400);
    }

    const issue = await orderService.getIssueById(id);
    if (!issue) {
      return sendResponse(res, { message: "Issue not found", error: true }, 404);
    }

    await orderService.deleteIssue(id);

    sendResponse(res, {
      message: "Issue deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllIssues = async (req: Request, res: Response) => {
  await OrderIssues.deleteAllIssues();
  sendResponse(res, {
    message: "All issues deleted successfully",
  });
};