import { getUsers } from "@/actions/users";
import { UsersList } from "@/components/config/users-list";

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Utilisateurs</h2>
                <p className="text-muted-foreground">
                    Gérez les utilisateurs du système.
                </p>
            </div>
            <UsersList users={users} />
        </div>
    );
}
