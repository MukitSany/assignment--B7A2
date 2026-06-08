import { Router } from "express";
import { auth, authorizeRoles } from "../../utils/auth";
import { createIssue, deleteAllIssues, deleteIssue, getAllIssues, getSingleIssue, updateIssue } from "../controllers/order.controller";


const router = Router();

router.get("/issues", auth, authorizeRoles("contributor"), getAllIssues);
// router.get("/issues/", auth, authorizeRoles("contributor"), getAllIssues);
router.post("/issues", auth, authorizeRoles("contributor"), createIssue);
router.get("/issues/:id",auth,authorizeRoles("contributor"), getSingleIssue);
router.patch("/issues/:id", auth, authorizeRoles("contributor", "maintainer"), updateIssue);
router.delete("/issues/delete-all", auth, authorizeRoles("maintainer"), deleteAllIssues);
router.delete("/issues/:id", auth, authorizeRoles("maintainer"), deleteIssue);


export default router;