import { sql } from "../../db";
import type { issues, Newissues } from "../../types";
import authService from "./auth.service";


class OrderIssues {
  async createIssue({ reporter_id, title, description, type,status }: Newissues) {
    const user = await authService.getUserById(String(reporter_id));

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

  async updateIssue(id: number, data: Partial<Pick<issues, "title" | "description" | "type">>) {
  const [updated] = await sql`
    UPDATE issues
    SET
      title = COALESCE(${data.title ?? null}, title),
      description = COALESCE(${data.description ?? null}, description),
      type = COALESCE(${data.type ?? null}, type),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return updated;
}



async getIssueById(id: number) {
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
    updated_at: issue.updated_at,
  };
}

  

  async getAllIssues(filters: { sort?: string; type?: string; status?: string }) {
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
    WHERE id = ANY(${reporterIds as number[]})
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
    updated_at: issue.updated_at,
  }));
}
  

  async deleteAllIssues() {
    await sql`DELETE FROM issues`;
  }
}

export default new OrderIssues();