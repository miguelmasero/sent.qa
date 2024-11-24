import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Supply {
  id: number;
  item: string;
  status: string;
}

export default function NotesDialog() {
  const [newItem, setNewItem] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: supplies = [] } = useQuery<Supply[]>({
    queryKey: ["supplies"],
    queryFn: async () => {
      const response = await fetch("/api/supplies");
      if (!response.ok) throw new Error("Failed to fetch supplies");
      return response.json();
    },
  });

  const addSupplyMutation = useMutation({
    mutationFn: async (item: string) => {
      const response = await fetch("/api/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item }),
      });
      if (!response.ok) throw new Error("Failed to add supply");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
      setNewItem("");
      toast({
        title: "Success",
        description: "Supply item added successfully",
      });
    },
  });

  const toggleSupplyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/supplies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update supply");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
    },
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    addSupplyMutation.mutate(newItem);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardList className="mr-2 h-4 w-4" />
          Supplies & Notes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cleaning Supplies & Notes</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <form onSubmit={handleAddItem} className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add new supply item..."
            />
            <Button type="submit" disabled={addSupplyMutation.isPending}>
              Add
            </Button>
          </form>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {supplies.map((supply) => (
                <div
                  key={supply.id}
                  className="flex items-center space-x-2 border p-2 rounded"
                >
                  <Checkbox
                    checked={supply.status === "completed"}
                    onCheckedChange={(checked) =>
                      toggleSupplyMutation.mutate({
                        id: supply.id,
                        status: checked ? "completed" : "needed",
                      })
                    }
                  />
                  <span
                    className={
                      supply.status === "completed" ? "line-through text-muted-foreground" : ""
                    }
                  >
                    {supply.item}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
