import { getUsers } from "@/actions/users";
import { UsersList } from "@/components/config/users-list";

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <UsersList
            users={users as any[]}
            title="Utilisateurs"
            description="Gérez les comptes utilisateurs et les accès à votre organisation."
        />
    );
}
