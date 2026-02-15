"use client";

import { useState } from "react";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateMyProfile } from "@/actions/users";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
    user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [firstName, setFirstName] = useState(user.first_name || "");
    const [lastName, setLastName] = useState(user.last_name || "");
    const [username, setUsername] = useState(user.username || "");
    const [email, setEmail] = useState(user.email || "");
    const [phone, setPhone] = useState(user.phone || "");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);

        try {
            await updateMyProfile({
                first_name: firstName,
                last_name: lastName,
                username,
                email,
                phone
            });
            toast.success("Profil mis à jour avec succès");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de la mise à jour");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4 max-w-md">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input
                        id="first_name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="last_name">Nom</Label>
                    <Input
                        id="last_name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="username">Nom d'utilisateur (optionnel)</Label>
                <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+223 ..."
                />
            </div>

            <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer les modifications
            </Button>
        </form>
    );
}
