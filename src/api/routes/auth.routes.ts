import { Router } from "express";
import { deleteAccount, getCurrentUser, login, logout, refresh, signup, updateUser } from "../controllers/auth.controller";
import { auth } from "../../utils/auth";

const router = Router()

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout",logout)
router.get("/refresh", refresh)

router.get("/me", getCurrentUser)

router.put("/update/:id", auth,updateUser);

router.delete("/delete/:id", auth, deleteAccount)

export default router
