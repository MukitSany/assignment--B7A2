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
      i.id,i.title,i.description,i.type,i.status,i.created_at,i.updated_at,
      json_build_object(
        'id', u.id,
        'name', u.name,
        'role', u.role
      ) AS reporter
    FROM issues i
    JOIN users u ON i.reporter_id = u.id
    WHERE i.id = ${id}
  `;
  return issue;
}

  async getAllissues() {
    const issues = await sql`SELECT * FROM issues`;
    return issues;
  }
  

  async deleteAllIssues() {
    await sql`DELETE FROM issues`;
  }
}

export default new OrderIssues();