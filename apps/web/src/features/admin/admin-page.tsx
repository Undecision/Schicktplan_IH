import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersPage } from "./users-page";
import { StammdatenManager } from "./stammdaten/stammdaten-manager";
import { STAMMDATEN_RESOURCES } from "./stammdaten/config";

const STAMMDATEN_TABS = Object.values(STAMMDATEN_RESOURCES);

export function AdminPage() {
  return (
    <Tabs defaultValue="benutzer">
      <TabsList>
        <TabsTrigger value="benutzer">Benutzer</TabsTrigger>
        {STAMMDATEN_TABS.map((resource) => (
          <TabsTrigger key={resource.endpoint} value={resource.endpoint}>
            {resource.labelPlural}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="benutzer">
        <UsersPage />
      </TabsContent>

      {STAMMDATEN_TABS.map((resource) => (
        <TabsContent key={resource.endpoint} value={resource.endpoint}>
          <StammdatenManager resource={resource} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
