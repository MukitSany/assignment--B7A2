
   import { createRequire } from 'module';
   const require = createRequire(import.meta.url);
  

// src/app.ts
import express from "express";

// src/middleware/logger.ts
var logger = (req, res, next) => {
  console.log(req.method);
  next();
};

// src/config/index.ts
import dotenv from "dotenv";
import { env } from "process";
dotenv.config({ quiet: true });
var config = {
  port: env.PORT,
  database_url: env.DATABASE_URL,
  node_env: env.NODE_ENV,
  jwt_secret: env.JWT_SECRET,
  refress_secret: env.REFRESS_SECRET
};
var config_default = config;

// src/middleware/globalErrosHandlader.ts
var globalErrosHandlader = (err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: err instanceof Error ? err.message : "internal Server Erros",
    stack: config_default.node_env === "development" && err instanceof Error ? err.stack : void 0
  });
};

// src/api/routes/auth.routes.ts
import { Router } from "express";

// src/db/index.ts
import { neon } from "@neondatabase/serverless";
var sql = neon(config_default.database_url);
sql`
 SELECT * FROM users
`;
var initDB = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(75) NOT NULL,
        email VARCHAR(260) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    `;
  await sql`
    CREATE TABLE IF NOT EXISTS issues (
        id SERIAL PRIMARY KEY,
        reporter_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR(30) NOT NULL CHECK (type IN ('bug', 'feature_request')),
        status VARCHAR(30) NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    `;
  console.log("database Connected");
};

// src/api/services/auth.service.ts
import bcrypt from "bcrypt";
var AuthService = class {
  async hashPassword(password) {
    const hash = await bcrypt.hash(password, 10);
    return hash;
  }
  async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
  async createUser(user) {
    const { name, email, role: role2, password } = user;
    const hash = await this.hashPassword(password);
    const res = await sql`
        INSERT INTO users (name,email,password_hash, role)
        VALUES (${name},${email}, ${hash},COALESCE(${role2}, 'contributor'))
        RETURNING id, name, email, role, created_at, updated_at
    `;
    return res[0];
  }
  async validateUser(email, password) {
    const res = await sql`
    SELECT id,name,email,password_hash,role,created_at,updated_at FROM users WHERE email = ${email}
    `;
    if (!res.length) {
      return null;
    }
    const { password_hash, ...user } = res[0];
    const isValid = await bcrypt.compare(password, password_hash);
    return isValid ? user : null;
  }
  async getUserById(userId) {
    const res = await sql`
    SELECT id,name,email,role FROM users WHERE id =${userId}
    `;
    return res[0];
  }
  async updateUser(userId, updates) {
    const { name, email, role: role2, password } = updates;
    let passwordHash;
    if (password) {
      passwordHash = await this.hashPassword(password);
    }
    const result = await sql`
      UPDATE users
      SET
        name = COALESCE(${name}, name),
        email = COALESCE(${email}, email),
        role = COALESCE(${role2}, role),
        password_hash = COALESCE(${passwordHash}, password_hash),
        updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id, name, email, role, created_at, updated_at
    `;
    return result[0];
  }
  async deleteUser(userId) {
    try {
      await sql`
        DELETE FROM users
        WHERE id = ${userId}
      `;
      return true;
    } catch {
      return false;
    }
  }
};
var auth_service_default = new AuthService();

// src/utils/sendResponse.ts
function sendResponse(res, { message, data, error }, status = 200) {
  res.status(status).json({
    success: error ? false : true,
    message,
    data: error ? void 0 : data
  });
}

// src/utils/jwt.ts
import jwt from "jsonwebtoken";
var verifyToken = (token, type) => {
  const secret = type === "refresh" ? config_default.jwt_secret : config_default.refress_secret;
  const decode = jwt.verify(token, secret);
  return decode;
};
var signToken = (payload) => {
  const accessToken = jwt.sign(payload, config_default.jwt_secret, {
    expiresIn: "2d"
  });
  const refreshToken = jwt.sign(payload, config_default.refress_secret, {
    expiresIn: "10d"
  });
  return { accessToken, refreshToken };
};

// src/api/controllers/auth.controller.ts
var signup = async (req, res) => {
  const { name, email, password, role: role2 } = req.body;
  const user = await auth_service_default.createUser({ name, email, password, role: role2 });
  if (!user) {
    sendResponse(res, { message: "failed to get user", error: true }, 400);
    return;
  }
  sendResponse(res, { message: "User registered successfully", data: user }, 201);
};
var login = async (req, res) => {
  const { email, password } = req.body;
  const user = await auth_service_default.validateUser(email, password);
  if (!user) {
    sendResponse(res, { message: "User not Found", error: true }, 401);
    return;
  }
  const { accessToken, refreshToken } = signToken(user);
  res.cookie("refreshToken", refreshToken, {
    sameSite: "lax",
    httpOnly: true,
    secure: false
  });
  const result = {
    refreshToken,
    user
    // accessToken,
    // refreshToken
  };
  return sendResponse(res, { message: "Login successful", data: result });
};
var logout = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return sendResponse(res, { message: "No active session found", error: true }, 400);
  }
  res.clearCookie("refreshToken", {
    secure: false,
    httpOnly: true,
    sameSite: "lax"
  });
  sendResponse(res, { message: "Logged out successfully" }, 200);
};
var refresh = async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    return sendResponse(res, { message: "Refresh token not found" }, 401);
  }
  const payload = verifyToken(refreshToken, "refresh");
  if (!payload) {
    return sendResponse(res, { message: "Invalid refresh token" }, 401);
  }
  const user = await auth_service_default.getUserById(payload.id);
  if (!user) {
    return sendResponse(res, { message: "User not found" }, 401);
  }
  const { accessToken, refreshToken: NewRefreshToken } = signToken(user);
  res.cookie("refreshToken", NewRefreshToken, {
    secure: false,
    sameSite: "lax",
    httpOnly: true
  });
  sendResponse(res, {
    message: "Token Refreshed",
    data: {
      accessToken,
      NewRefreshToken
    }
  });
};
var getCurrentUser = async (req, res) => {
  const accessToken = req.headers.authorization;
  if (!accessToken) {
    return sendResponse(res, { message: "Unauthorized", error: true }, 401);
  }
  const userId = verifyToken(accessToken, "access")?.id;
  const user = await auth_service_default.getUserById(userId);
  if (!user) {
    return sendResponse(res, { message: "User not found", error: true }, 404);
  }
  sendResponse(res, { message: "User fetched successfully", data: user }, 200);
};
var updateUser = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return sendResponse(res, { message: "Unauthorized", error: true }, 401);
  }
  const { name, email, age, password } = req.body;
  const updated = await auth_service_default.updateUser(userId, { name, email, password });
  if (!updated) {
    return sendResponse(res, { message: "Failed to update user", error: true }, 400);
  }
  sendResponse(res, { message: "User updated successfully", data: updated }, 200);
};
var deleteAccount = async (req, res) => {
  const id = req.user?.id;
  if (!id) {
    return sendResponse(res, { message: "Unauthorized", error: true }, 401);
  }
  const deleted = await auth_service_default.deleteUser(id);
  if (!deleted) {
    return sendResponse(res, { message: "Failed to delete account", error: true }, 400);
  }
  res.clearCookie("refreshToken", {
    secure: false,
    httpOnly: true,
    sameSite: "lax"
  });
  sendResponse(res, { message: "Account deleted successfully" }, 200);
};

// src/utils/auth.ts
var auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return sendResponse(res, { message: "token not found" }, 401);
    }
    const payload = verifyToken(token, "access");
    if (!payload) {
      return sendResponse(res, { message: "Invalid token" }, 401);
    }
    const user = await auth_service_default.getUserById(String(payload.id));
    if (!user) {
      return sendResponse(res, { message: "User not found", error: true }, 401);
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
var authorizeRoles = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return sendResponse(_res, { message: "Unauthorized", error: true }, 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendResponse(
        _res,
        { message: "Forbidden - you don't have permission", error: true },
        403
      );
    }
    return next();
  };
};

// src/api/routes/auth.routes.ts
var router = Router();
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/refresh", refresh);
router.get("/me", getCurrentUser);
router.put("/update/:id", auth, updateUser);
router.delete("/delete/:id", auth, deleteAccount);
var auth_routes_default = router;

// src/api/routes/order.routes.ts
import { Router as Router2 } from "express";

// src/api/services/order.service.ts
var OrderIssues = class {
  async createIssue({ reporter_id, title, description, type, status }) {
    const user = await auth_service_default.getUserById(String(reporter_id));
    if (!user) {
      throw new Error("User not found");
    }
    const [newIssue] = await sql`
      INSERT INTO issues (reporter_id, title, description, type, status)
      VALUES (${reporter_id}, ${title}, ${description}, ${type},${status})
      RETURNING id,title,description,type,status,reporter_id,created_at,updated_at
    `;
    return newIssue;
  }
  async updateIssue(id, data) {
    const [updated] = await sql`
    UPDATE issues
    SET
      title = COALESCE(${data.title ?? null}, title),
      description = COALESCE(${data.description ?? null}, description),
      status = 'in_progress',
      type = COALESCE(${data.type ?? null}, type),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
    return updated;
  }
  async getIssueById(id) {
    const [issue] = await sql`
    SELECT
      i.id,
      i.title,
      i.description,
      i.type,
      i.status,
      i.reporter_id,
      i.created_at,
      i.updated_at
    FROM issues i
    WHERE i.id = ${id}
  `;
    if (!issue) return null;
    const [reporter] = await sql`
    SELECT id, name, role FROM users
    WHERE id = ${issue.reporter_id}
  `;
    return {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      reporter: reporter ?? null,
      created_at: issue.created_at,
      updated_at: issue.updated_at
    };
  }
  async getAllIssues(filters) {
    const { sort, type, status } = filters;
    const order = sort === "oldest" ? sql`ASC` : sql`DESC`;
    const issues = await sql`
    SELECT
      id,
      title,
      description,
      type,
      status,
      reporter_id,
      created_at,
      updated_at
    FROM issues
    WHERE
      (${type ?? null}::text IS NULL OR type = ${type ?? null}::text)
      AND (${status ?? null}::text IS NULL OR status = ${status ?? null}::text)
    ORDER BY created_at ${order}
  `;
    if (issues.length === 0) return [];
    const reporterIds = [...new Set(issues.map((i) => i.reporter_id))];
    const reporters = await sql`
    SELECT id, name, role FROM users
    WHERE id = ANY(${reporterIds})
  `;
    const reporterMap = Object.fromEntries(reporters.map((r) => [r.id, r]));
    return issues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      reporter: reporterMap[issue.reporter_id] ?? null,
      created_at: issue.created_at,
      updated_at: issue.updated_at
    }));
  }
  async deleteAllIssues() {
    await sql`DELETE FROM issues`;
  }
  async deleteIssue(id) {
    const [deleted] = await sql`
    DELETE FROM issues
    WHERE id = ${id}
    RETURNING *
  `;
    return deleted;
  }
};
var order_service_default = new OrderIssues();

// src/api/controllers/order.controller.ts
var getAllIssues = async (req, res, next) => {
  try {
    const { sort, type, status } = req.query;
    const issues = await order_service_default.getAllIssues({
      sort,
      type,
      status
    });
    sendResponse(res, {
      message: "Issues retrieved successfully",
      data: issues
    }, 200);
  } catch (error) {
    next(error);
  }
};
var createIssue = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendResponse(res, { message: "Unauthorized", error: true }, 401);
    }
    const { title, description, type, status } = req.body;
    const reporter_id = +req.user.id;
    if (!title || !description || !type) {
      return sendResponse(res, { message: "All fields are required", error: true }, 400);
    }
    const newIssue = await order_service_default.createIssue({
      reporter_id,
      title,
      description,
      type,
      status: "open"
    });
    sendResponse(res, {
      message: "Issue created successfully",
      data: newIssue
    }, 201);
  } catch (error) {
    next(error);
  }
};
var getSingleIssue = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendResponse(res, { message: "Invalid issue ID", error: true }, 400);
    }
    const issue = await order_service_default.getIssueById(id);
    if (!issue) {
      return sendResponse(res, { message: "Issue not found", error: true }, 404);
    }
    sendResponse(res, {
      message: "Issue retrieved successfully",
      data: issue
    }, 200);
  } catch (error) {
    next(error);
  }
};
var updateIssue = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendResponse(res, { message: "Unauthorized", error: true }, 401);
    }
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendResponse(res, { message: "Invalid issue ID", error: true }, 400);
    }
    const issue = await order_service_default.getIssueById(id);
    if (!issue) {
      return sendResponse(res, { message: "Issue not found", error: true }, 404);
    }
    const { role: role2, id: userId } = req.user;
    if (role2 === "contributor") {
      if (!issue.reporter || issue.reporter.id !== userId) {
        return sendResponse(res, { message: "You can only update your own issues", error: true }, 403);
      }
      if (issue.status !== "open") {
        return sendResponse(res, { message: "You can only update open issues", error: true }, 403);
      }
    }
    const { title, description, type } = req.body;
    const updatedIssues = await order_service_default.updateIssue(id, { title, description, type });
    sendResponse(res, {
      message: "Issue updated successfully",
      data: updatedIssues
    });
  } catch (error) {
    next(error);
  }
};
var deleteIssue = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendResponse(res, { message: "Unauthorized", error: true }, 401);
    }
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return sendResponse(res, { message: "Invalid issue ID", error: true }, 400);
    }
    const issue = await order_service_default.getIssueById(id);
    if (!issue) {
      return sendResponse(res, { message: "Issue not found", error: true }, 404);
    }
    await order_service_default.deleteIssue(id);
    sendResponse(res, {
      message: "Issue deleted successfully"
    }, 200);
  } catch (error) {
    next(error);
  }
};
var deleteAllIssues = async (req, res) => {
  await order_service_default.deleteAllIssues();
  sendResponse(res, {
    message: "All issues deleted successfully"
  }, 200);
};

// src/api/routes/order.routes.ts
var router2 = Router2();
router2.get("/issues", auth, authorizeRoles("contributor"), getAllIssues);
router2.post("/issues", auth, authorizeRoles("contributor"), createIssue);
router2.get("/issues/:id", auth, authorizeRoles("contributor"), getSingleIssue);
router2.patch("/issues/:id", auth, authorizeRoles("contributor", "maintainer"), updateIssue);
router2.delete("/issues/delete-all", auth, authorizeRoles("maintainer"), deleteAllIssues);
router2.delete("/issues/:id", auth, authorizeRoles("maintainer"), deleteIssue);
var order_routes_default = router2;

// src/app.ts
import cokieParser from "cookie-parser";
var app = express();
app.use(logger);
app.use(cokieParser());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hi this is Mukit");
});
app.use("/api/auth", auth_routes_default);
app.use("/api", order_routes_default);
app.use(globalErrosHandlader);
var app_default = app;

// src/index.ts
var main = async () => {
  initDB();
  app_default.listen(config_default.port, () => {
    console.log(`My Server is running ${config_default.port}`);
  });
};
main();
//# sourceMappingURL=index.js.map