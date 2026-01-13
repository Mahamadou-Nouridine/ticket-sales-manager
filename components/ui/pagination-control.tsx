"use client";

import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PaginationControlProps {
    itemsPerPage: number;
    onItemsPerPageChange: (value: number) => void;
}

export function PaginationControl({ itemsPerPage, onItemsPerPageChange }: PaginationControlProps) {
    function handleManualInput(value: string) {
        const num = parseInt(value);
        if (!isNaN(num) && num >= 1 && num <= 500) {
            onItemsPerPageChange(num);
        }
    }

    return (
        <div className="flex items-center gap-2">
            <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
            >
                <SelectTrigger className="w-[120px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">ou</span>
            <Input
                type="number"
                min="1"
                max="500"
                value={itemsPerPage}
                onChange={(e) => handleManualInput(e.target.value)}
                className="w-[80px]"
                placeholder="Autre"
            />
        </div>
    );
}
