"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { onboardWaitlistUser, getWaitlistEmailTemplate } from "@/actions/admin";
import { toast } from "sonner";
import { Copy, Check, UserPlus, Mail, ExternalLink } from "lucide-react";

interface WaitlistEntry {
    _id: string;
    email: string;
    fullName: string;
    wifiZoneName: string;
    position: number;
    status: string;
    isHandled: boolean;
    createdAt: string;
}

export function WaitlistTable({ initialEntries }: { initialEntries: any[] }) {
    const [entries, setEntries] = useState<WaitlistEntry[]>(initialEntries);
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [templateModal, setTemplateModal] = useState<{ open: boolean, content: string }>({ open: false, content: "" });
    const [copied, setCopied] = useState(false);

    const handleApprove = async (id: string) => {
        setIsLoading(id);
        try {
            const res = await onboardWaitlistUser(id);
            if (res.success) {
                toast.success("Utilisateur et organisation créés avec succès !");
                setEntries(entries.map(e => e._id === id ? { ...e, isHandled: true } : e));
                setTemplateModal({ open: true, content: res.emailTemplate! });
            } else {
                toast.error(res.details || "Une erreur est survenue lors de l'onboarding.");
            }
        } catch (error) {
            toast.error("Erreur de connexion au serveur.");
        } finally {
            setIsLoading(null);
        }
    };

    const handleViewTemplate = async (id: string) => {
        setIsLoading(id);
        try {
            const res = await getWaitlistEmailTemplate(id);
            if (res.success) {
                setTemplateModal({ open: true, content: res.emailTemplate! });
            } else {
                toast.error(res.details || "Impossible de récupérer le modèle.");
            }
        } catch (error) {
            toast.error("Erreur de connexion.");
        } finally {
            setIsLoading(null);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(templateModal.content);
        setCopied(true);
        toast.success("Modèle d'email copié !");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <Card className="border-gray-800 bg-gray-900/50 text-white">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-blue-500" />
                        Gestion de la Liste d'attente
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader className="border-gray-800">
                            <TableRow className="hover:bg-transparent border-gray-800">
                                <TableHead className="text-gray-400">Statut</TableHead>
                                <TableHead className="text-gray-400">Nom</TableHead>
                                <TableHead className="text-gray-400">Email</TableHead>
                                <TableHead className="text-gray-400">Wifi-Zone</TableHead>
                                <TableHead className="text-gray-400">Position</TableHead>
                                <TableHead className="text-gray-400">Date</TableHead>
                                <TableHead className="text-right text-gray-400">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {entries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                                        Aucune inscription trouvée.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                entries.map((entry) => (
                                    <TableRow key={entry._id} className="border-gray-800 hover:bg-gray-800/30">
                                        <TableCell>
                                            {entry.isHandled ? (
                                                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                                                    Traité
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                                                    En attente
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium">{entry.fullName}</TableCell>
                                        <TableCell className="text-gray-400 text-sm">{entry.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/5">
                                                {entry.wifiZoneName}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-mono text-zinc-400">#{entry.position}</TableCell>
                                        <TableCell className="text-gray-500 text-xs">
                                            {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {entry.isHandled ? (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-gray-400 hover:text-white hover:bg-gray-800"
                                                    onClick={() => handleViewTemplate(entry._id)}
                                                    disabled={isLoading === entry._id}
                                                >
                                                    <Mail className="h-4 w-4 mr-2" />
                                                    Template
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={() => handleApprove(entry._id)}
                                                    disabled={isLoading === entry._id}
                                                >
                                                    {isLoading === entry._id ? "Création..." : "Approuver"}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={templateModal.open} onOpenChange={(open) => setTemplateModal(prev => ({ ...prev, open }))}>
                <DialogContent className="max-w-2xl bg-gray-900 border-gray-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-green-500" />
                            Email d'onboarding généré
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Le compte a été créé avec succès. Copiez ce message pour l'envoyer au testeur.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="relative mt-4">
                        <pre className="p-4 rounded-lg bg-gray-950 border border-gray-800 text-sm whitespace-pre-wrap font-sans text-gray-300 max-h-[400px] overflow-y-auto">
                            {templateModal.content}
                        </pre>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 hover:bg-gray-800 text-gray-400"
                            onClick={copyToClipboard}
                        >
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => setTemplateModal(prev => ({ ...prev, open: false }))}
                        >
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
