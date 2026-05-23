// apps/web/app/presets/new/page.tsx
import { PresetWizard } from "@/components/presets/preset-wizard";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function NewPresetPage() {
    const { t } = await getServerI18n();
    return (
        <div className="space-y-6 px-5 py-0">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t.presetsPage.newPreset}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t.presetsPage.subtitle}</p>
            </div>
            <PresetWizard />
        </div>
    );
}
