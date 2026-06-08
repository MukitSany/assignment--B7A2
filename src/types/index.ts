export const role = ["user","contributor","maintainer"] as const

export type Role = (typeof role)[number]

export type User = {
    id: number,
    name: string,
    email: string,
    password_hash: string,
    role: Role,
    created_at: Date,
    updated_at: Date



}

export type RUser = Omit<User, "id" | "created_at" | "updated_at"| "password_hash">

export type issues = {
    id: number,
    reporter_id: number,
    title: string,
    description: string,
    type: string,
    status: string,
    created_at: Date,
    updated_at: Date



}

export type Newissues = Omit<issues, "id"|"created_at"|"updated_at">;