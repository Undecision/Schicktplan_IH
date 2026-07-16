import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Check, Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/auth-context";
import { useQuittieren, useUngelesenAnweisungen } from "./queries";

/**
 * Anmelde-Popup: zeigt ungelesene Arbeitsanweisungen beim Öffnen der App. Der
 * Nutzer kann das Popup schließen (die Anweisung bleibt ungelesen) oder direkt
 * quittieren. Erscheint nur, wenn der Nutzer Anweisungen lesen darf und für
 * dieses Session-Fenster noch nicht geschlossen wurde.
 */
export function AnweisungPopup() {
  const { hasPermission } = useAuth();
  const darfLesen = hasPermission("anweisungen:read");
  const { data: ungelesen = [] } = useUngelesenAnweisungen(darfLesen);
  const quittieren = useQuittieren();
  const navigate = useNavigate();
  const [geschlossen, setGeschlossen] = useState(false);

  const offen = darfLesen && !geschlossen && ungelesen.length > 0;

  // Wenn alle quittiert wurden, Popup automatisch schließen.
  useEffect(() => {
    if (darfLesen && ungelesen.length === 0) setGeschlossen(false);
  }, [darfLesen, ungelesen.length]);

  if (!darfLesen) return null;

  return (
    <Dialog open={offen} onOpenChange={(open) => !open && setGeschlossen(true)}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Neue Arbeitsanweisungen ({ungelesen.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Bitte lesen und als gelesen quittieren. Sie können dies auch später unter „Anweisungen"
            erledigen.
          </p>
          {ungelesen.map((a) => (
            <div key={a.id} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{a.titel}</span>
                {a.anhang && <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </div>
              {a.text && <p className="line-clamp-3 text-sm text-muted-foreground">{a.text}</p>}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{a.gewerk.name}</Badge>
                {a.schicht && <Badge variant="outline">{a.schicht.name}</Badge>}
                <span>von {a.ersteller.name}</span>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGeschlossen(true);
                    navigate("/anweisungen");
                  }}
                >
                  Details ansehen
                </Button>
                <Button
                  size="sm"
                  onClick={() => quittieren.mutate(a.id)}
                  disabled={quittieren.isPending}
                >
                  <Check className="h-4 w-4" />
                  Gelesen
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setGeschlossen(true)}>
            Später
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
