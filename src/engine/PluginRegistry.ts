import type { IPlugin, PluginPhase, ResourceContext } from "./types.js";

export class PluginRegistry {
    private plugins: IPlugin[] = [];

    register(plugin: IPlugin): this {
        this.plugins.push(plugin);
        return this;
    }

    list(): IPlugin[] {
        return [...this.plugins];
    }

    async runPhase(phase: PluginPhase, ctx: ResourceContext): Promise<void> {
        const eligible = this.plugins.filter((p) => p.phases.includes(phase) && p.applies(ctx));

        // ordre d'exécution simple : ordre d’enregistrement
        for (const p of eligible) {
            await p.run(phase, ctx);
        }
    }
}
