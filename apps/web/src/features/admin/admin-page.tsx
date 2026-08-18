import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersPage } from "./users-page";
import { RolesManager } from "./roles-manager";
import { StammdatenManager } from "./stammdaten/stammdaten-manager";
import { STAMMDATEN_RESOURCES } from "./stammdaten/config";
import { SchichtbuchSpaltenAdmin } from "./schichtbuch-spalten-admin";

const STAMMDATEN_TABS = Object.values(STAMMDATEN_RESOURCES);

export function AdminPage() {
  return (
    <Tabs defaultValue="benutzer">
      <TabsList>
        <TabsTrigger value="benutzer">Benutzer</TabsTrigger>
        <TabsTrigger value="rollen">Rollen</TabsTrigger>
        {STAMMDATEN_TABS.map((resource) => (
          <TabsTrigger key={resource.endpoint} value={resource.endpoint}>
            {resource.labelPlural}
          </TabsTrigger>
        ))}
        <TabsTrigger value="schichtbuch-spalten">Schichtbuch-Spalten</TabsTrigger>
      </TabsList>

      <TabsContent value="benutzer">
        <UsersPage />
      </TabsContent>

      <TabsContent value="rollen">
        <RolesManager />
      </TabsContent>

      {STAMMDATEN_TABS.map((resource) => (
        <TabsContent key={resource.endpoint} value={resource.endpoint}>
          <StammdatenManager resource={resource} />
        </TabsContent>
      ))}

      <TabsContent value="schichtbuch-spalten">
        <SchichtbuchSpaltenAdmin />
      </TabsContent>
    </Tabs>
  );
}
