import { ChevronRight } from "lucide-react";

/**
 * Directional connector drawn between two pipeline nodes.
 * Vertical (flow runs downward) on mobile; horizontal (flow runs rightward)
 * from `md` up. Purely decorative — hidden from assistive tech.
 */
export function FlowConnector() {
    return (
        <div
            aria-hidden
            className="flex shrink-0 items-center justify-center self-center py-1 md:py-0 md:px-1.5"
        >
            <span className="block h-5 w-px bg-gradient-to-b from-border to-primary/50 md:h-px md:w-7 md:bg-gradient-to-r" />
            <ChevronRight className="-ml-[3px] h-3.5 w-3.5 rotate-90 text-primary/60 md:-ml-px md:rotate-0" />
        </div>
    );
}
