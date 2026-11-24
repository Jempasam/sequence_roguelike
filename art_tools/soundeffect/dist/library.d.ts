export interface LibraryEntry {
    signature: string;
    doc: string;
}
export interface LibraryFile {
    file: string;
    description: string;
    entries: LibraryEntry[];
}
export interface ExampleFile {
    name: string;
    file: string;
    description: string;
    duration: string;
}
/**
 * What each library file offers. A function is documented by a comment line right above it:
 * `// @ ad(attack, t) -- attack / decay envelope`.
 */
export declare function describeLibraries(dir?: string): LibraryFile[];
export declare function describeExamples(dir?: string): ExampleFile[];
