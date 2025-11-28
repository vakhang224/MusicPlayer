// src/hooks/useUsers.tsx
import { useState, useEffect } from "react";
import { getBaseUrl } from "@/services/baseUrlManager";

export interface User {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
  isVerified: boolean;
  isAdmin: boolean;
}

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const baseUrl = getBaseUrl();
        const res = await fetch(`${baseUrl}/users`);
        if (!res.ok) throw new Error("Lỗi fetch users");
        const data = await res.json();
        console.log("📦 [useUsers] API /users response:", data);


        const processed: User[] = data
          .map((u: any) => {
            const isVerified = Number(u.isVerified) === 1;
            const isAdmin = Number(u.isAdmin) === 1;

            return {
              id: u.id,
              username: u.username,
              name: u.name,
              avatar: u.avatar
                ? u.avatar.startsWith("http")
                  ? u.avatar
                  : `${baseUrl}/${u.avatar.replace(/^\/+/, "")}`
                : undefined,
              isVerified,
              isAdmin,
            };
          })
          // ✅ Chỉ giữ user KHÔNG phải admin và ĐÃ verified
          .filter((u: User) => !u.isAdmin && u.isVerified);

        setUsers(processed);
      } catch (err: any) {
        console.error("❌ useUsers fetch error:", err);
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading, error };
};
