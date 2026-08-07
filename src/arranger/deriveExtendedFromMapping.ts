import { Client } from '@elastic/elasticsearch';

// Fields the report engine reads off an extended-config entry: `field` (dotted
// path — column whitelist + source path), `type` (transform + nested detection),
// `displayName` (header fallback when a column has no explicit `header`).
export type ExtendedEntry = {
    field: string;
    type: string;
    displayName: string;
};

type MappingProperty = {
    type?: string;
    properties?: Record<string, MappingProperty>;
};

// Title-case a dotted path (`down_syndrome_status` -> "Down Syndrome Status"),
// reproducing arranger's auto-generated displayName so headerless columns keep their headers.
const titleCase = (path: string): string =>
    path
        .split(/[._]/)
        .map((part) => (part.length === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
        .join(' ');

const typeFor = (def: MappingProperty): string => {
    if (def.type === 'nested') return 'nested';
    if (def.properties) return 'object';
    return def.type || 'unknown';
};

const walk = (properties: Record<string, MappingProperty> | undefined, prefix: string, out: ExtendedEntry[]): void => {
    if (!properties) return;
    for (const [name, def] of Object.entries(properties)) {
        const field = prefix ? `${prefix}.${name}` : name;
        out.push({ field, type: typeFor(def), displayName: titleCase(field) });
        // Recurse objects + nested (nested always has `properties`). Leaf multi-fields
        // (`fields: { raw: ... }`) are skipped — configs never reference `.raw`.
        if (def.properties) walk(def.properties, field, out);
    }
};

/**
 * Derive the "extended config" from an ES `_mapping`, replacing the legacy
 * `arranger-projects-<projectId>` doc. One entry per mapping node (objects and
 * nested branches included, so the whitelist finds every dotted path a config
 * references). Response is keyed by the backing index name (the first/only key,
 * even when fetched via an alias).
 */
export const deriveExtendedFromMapping = (mappingBody: Record<string, any>): ExtendedEntry[] => {
    const indexKey = Object.keys(mappingBody || {})[0];
    if (!indexKey) {
        throw new Error('Mapping response has no top-level index key');
    }
    // eslint-disable-next-line no-underscore-dangle
    const properties: Record<string, MappingProperty> | undefined = mappingBody[indexKey]?.mappings?.properties;
    const out: ExtendedEntry[] = [];
    walk(properties, '', out);
    return out;
};

// Fetch an index/alias `_mapping` and derive its extended config (replaces getExtendedConfigs).
export const getExtendedFromMapping = async (es: Client, alias: string): Promise<ExtendedEntry[]> => {
    const response = await es.indices.getMapping({ index: alias });
    return deriveExtendedFromMapping(response.body as Record<string, any>);
};
