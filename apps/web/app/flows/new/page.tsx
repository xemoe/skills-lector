"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/context";
import { useCreateFlow } from "@/components/flow/use-flow-queries";

function toKebab(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function NewFlowPage() {
    const t = useT();
    const router = useRouter();
    const createFlow = useCreateFlow();

    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [slugTouched, setSlugTouched] = useState(false);
    const [slugError, setSlugError] = useState<string | null>(null);

    function handleNameChange(value: string) {
        setName(value);
        if (!slugTouched) {
            setSlug(toKebab(value));
        }
    }

    function handleSlugChange(value: string) {
        setSlugTouched(true);
        setSlug(value);
        setSlugError(null);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSlugError(null);
        createFlow.mutate(
            { slug, name, description: description.trim() || null },
            {
                onSuccess: (data) => {
                    router.push(`/flows/${data.flow.id}`);
                },
                onError: (err) => {
                    if (err instanceof Error && err.message === "slug_collision") {
                        setSlugError(
                            `Slug "${slug}" is already in use — choose a different one.`,
                        );
                    } else {
                        setSlugError("Something went wrong. Please try again.");
                    }
                },
            },
        );
    }

    return (
        <div className="space-y-6 px-5 py-0">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    {t.flowsPage.newFlow}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t.flowsPage.subtitle}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
                <div className="space-y-1.5">
                    <label
                        htmlFor="flow-name"
                        className="text-sm font-medium leading-none"
                    >
                        Name
                    </label>
                    <Input
                        id="flow-name"
                        required
                        placeholder="Ship a feature"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                    />
                </div>

                <div className="space-y-1.5">
                    <label
                        htmlFor="flow-slug"
                        className="text-sm font-medium leading-none"
                    >
                        Slug
                    </label>
                    <Input
                        id="flow-slug"
                        required
                        pattern="^[a-z0-9][a-z0-9-]*$"
                        placeholder="ship-a-feature"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        aria-invalid={slugError !== null}
                    />
                    {slugError !== null && (
                        <p className="text-xs text-destructive">{slugError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        URL-safe identifier. Auto-generated from name; edit if needed.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label
                        htmlFor="flow-description"
                        className="text-sm font-medium leading-none"
                    >
                        Description
                    </label>
                    <Textarea
                        id="flow-description"
                        placeholder="What kind of work is this flow for?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                    />
                </div>

                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={
                            createFlow.isPending ||
                            !name.trim() ||
                            !slug.trim()
                        }
                    >
                        {createFlow.isPending ? "Creating…" : "Create flow"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
